/*
# Replace email sign-in with name + password

## Summary
Players no longer use email or Supabase sign-in. The first time a player picks
their name they choose a password, which is stored (as a secure one-way hash)
on their participant row. Every later sign-in requires that same password.
Once a player has drawn, their match is saved and shown on every sign-in.

## 1. Changes to tables
- `participants`: new column `password_hash` (text, nullable). Null means the
  player has not chosen a password yet. Passwords are never stored in plain text.
- `draws`: new column `drawer_id` (uuid, references participants). It records
  which participant made the draw, so each person can have at most one draw.
  A unique constraint enforces that.
- `draws.user_id` and `draws.user_email` are no longer required, since draws
  are no longer tied to an email login. The columns are kept so no data is lost.

## 2. Security
- Anonymous visitors can read only the public roster columns of `participants`
  (id, name, family, created_at). `password_hash` and the old `email` column are
  never exposed.
- Anonymous visitors can read `draws` only as (id, drawer_id, drawn_at), so the
  checklist works without revealing who was matched with whom.
- No direct inserts, updates or deletes are allowed from the browser.
- Two SECURITY DEFINER functions do all the sensitive work and check the
  password on every call:
  - `sign_in_participant(participant id, password)`: creates the password on first
    use (minimum 4 characters), or verifies it on later sign-ins. Returns the
    player's match only after the password is verified.
  - `draw_match(participant id, password)`: verifies the password, then draws a
    random participant who has not been drawn yet and is not the player
    themselves. Runs under a table lock so two people cannot draw the same name.
- The old `claim_participant` and `draw_random_participant` functions are removed.

## 3. Important Notes
- Passwords are hashed with bcrypt through the pgcrypto extension.
- The `email` column on `participants` is left in place but is no longer used.
*/

ALTER TABLE participants ADD COLUMN IF NOT EXISTS password_hash text;

ALTER TABLE draws ADD COLUMN IF NOT EXISTS drawer_id uuid REFERENCES participants(id) ON DELETE CASCADE;
ALTER TABLE draws ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE draws ALTER COLUMN user_email DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draws_drawer_id_key') THEN
    ALTER TABLE draws ADD CONSTRAINT draws_drawer_id_key UNIQUE (drawer_id);
  END IF;
END $$;

REVOKE ALL ON participants FROM anon, authenticated;
GRANT SELECT (id, name, family, created_at) ON participants TO anon;

REVOKE ALL ON draws FROM anon, authenticated;
GRANT SELECT (id, drawer_id, drawn_at) ON draws TO anon;

DROP POLICY IF EXISTS "authenticated_read_participants" ON participants;
DROP POLICY IF EXISTS "anon_read_participants" ON participants;
CREATE POLICY "anon_read_participants" ON participants FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "authenticated_read_draws" ON draws;
DROP POLICY IF EXISTS "insert_own_draw" ON draws;
DROP POLICY IF EXISTS "anon_read_draws" ON draws;
CREATE POLICY "anon_read_draws" ON draws FOR SELECT
  TO anon USING (true);

DROP FUNCTION IF EXISTS claim_participant(uuid, text);
DROP FUNCTION IF EXISTS draw_random_participant(text);

CREATE OR REPLACE FUNCTION sign_in_participant(p_participant_id uuid, p_password text)
RETURNS TABLE (
  status text,
  participant_name text,
  participant_family text,
  match_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name text;
  v_family text;
  v_hash text;
  v_status text;
  v_match text;
BEGIN
  SELECT p.name, p.family, p.password_hash
    INTO v_name, v_family, v_hash
  FROM participants p
  WHERE p.id = p_participant_id
  FOR UPDATE;

  IF v_name IS NULL THEN
    v_status := 'not_found';
  ELSIF v_hash IS NULL THEN
    IF coalesce(char_length(p_password), 0) < 4 THEN
      v_status := 'weak_password';
    ELSE
      UPDATE participants
        SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
        WHERE id = p_participant_id;
      v_status := 'created';
    END IF;
  ELSIF extensions.crypt(coalesce(p_password, ''), v_hash) IS NOT DISTINCT FROM v_hash THEN
    v_status := 'ok';
  ELSE
    v_status := 'invalid_password';
  END IF;

  IF v_status IN ('created', 'ok') THEN
    SELECT m.name INTO v_match
    FROM draws d
    JOIN participants m ON m.id = d.participant_id
    WHERE d.drawer_id = p_participant_id;
  END IF;

  RETURN QUERY SELECT v_status, v_name, v_family, v_match;
END;
$$;

CREATE OR REPLACE FUNCTION draw_match(p_participant_id uuid, p_password text)
RETURNS TABLE (
  status text,
  match_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_match_id uuid;
  v_match text;
BEGIN
  SELECT p.password_hash INTO v_hash
  FROM participants p
  WHERE p.id = p_participant_id;

  IF v_hash IS NULL
     OR extensions.crypt(coalesce(p_password, ''), v_hash) IS DISTINCT FROM v_hash THEN
    RETURN QUERY SELECT 'invalid_password'::text, NULL::text;
    RETURN;
  END IF;

  LOCK TABLE draws IN SHARE ROW EXCLUSIVE MODE;

  SELECT m.id, m.name INTO v_match_id, v_match
  FROM draws d
  JOIN participants m ON m.id = d.participant_id
  WHERE d.drawer_id = p_participant_id;

  IF v_match_id IS NOT NULL THEN
    RETURN QUERY SELECT 'already_drawn'::text, v_match;
    RETURN;
  END IF;

  SELECT p.id, p.name INTO v_match_id, v_match
  FROM participants p
  WHERE p.id <> p_participant_id
    AND p.id NOT IN (SELECT d.participant_id FROM draws d)
  ORDER BY random()
  LIMIT 1;

  IF v_match_id IS NULL THEN
    RETURN QUERY SELECT 'none_left'::text, NULL::text;
    RETURN;
  END IF;

  INSERT INTO draws (drawer_id, participant_id)
  VALUES (p_participant_id, v_match_id);

  RETURN QUERY SELECT 'drawn'::text, v_match;
END;
$$;

REVOKE EXECUTE ON FUNCTION sign_in_participant(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sign_in_participant(uuid, text) TO anon;

REVOKE EXECUTE ON FUNCTION draw_match(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION draw_match(uuid, text) TO anon;
