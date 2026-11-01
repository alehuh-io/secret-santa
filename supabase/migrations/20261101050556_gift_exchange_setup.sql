/*
# Gift Exchange App — Schema & Logic

1. New Tables
- `participants`: the static list of people in the gift exchange.
  - `id` (uuid, primary key)
  - `name` (text, unique, not null) — the person's display name
  - `created_at` (timestamptz)
- `draws`: records which authenticated user drew which participant.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid()) — the person who drew
  - `user_email` (text, not null) — denormalized email for display
  - `participant_id` (uuid, not null, references participants) — who was drawn
  - `drawn_at` (timestamptz, defaults now())

2. Security
- Enable RLS on both tables.
- `participants`: anyone who is authenticated can read the list (it's a shared roster).
  No inserts/updates/deletes from the frontend — the list is static and managed via SQL.
- `draws`: authenticated users can read all draws (to see the checklist), but can only
  insert their own draw (WITH CHECK auth.uid() = user_id). No updates or deletes.
- The `draw_random_participant` function is SECURITY DEFINER so it can atomically pick
  an undrawn participant and insert a draw row, even though the frontend anon/authenticated
  role can't directly insert into participants. It revokes PUBLIC/anon execute and grants
  authenticated only.

3. Important Notes
- The `draw_random_participant` function is atomic: it locks the draws table, finds
  participants with no existing draw, picks one at random, inserts the draw row, and
  returns the participant. If a user already drew, it returns their existing draw.
- If no participants remain, it returns NULL.
*/

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  drawn_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON participants TO authenticated;
GRANT SELECT ON draws TO authenticated;
GRANT INSERT ON draws TO authenticated;

DROP POLICY IF EXISTS "authenticated_read_participants" ON participants;
CREATE POLICY "authenticated_read_participants"
  ON participants FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_draws" ON draws;
CREATE POLICY "authenticated_read_draws"
  ON draws FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_draw" ON draws;
CREATE POLICY "insert_own_draw"
  ON draws FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to atomically draw a random undrawn participant.
-- SECURITY DEFINER so the transaction is self-contained and atomic.
CREATE OR REPLACE FUNCTION draw_random_participant(p_user_email text)
RETURNS TABLE (
  participant_id uuid,
  participant_name text,
  already_drawn boolean,
  no_participants_remaining boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_participant_id uuid;
  v_existing_participant_name text;
  v_selected_id uuid;
  v_selected_name text;
BEGIN
  -- Check if user already drew
  SELECT d.participant_id, p.name
    INTO v_existing_participant_id, v_existing_participant_name
  FROM draws d
  JOIN participants p ON p.id = d.participant_id
  WHERE d.user_id = v_user_id
  LIMIT 1;

  IF v_existing_participant_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_participant_id, v_existing_participant_name, true, false;
    RETURN;
  END IF;

  -- Lock draws to prevent concurrent double-draws
  LOCK TABLE draws IN ACCESS EXCLUSIVE MODE;

  -- Pick a random participant that hasn't been drawn yet
  SELECT p.id, p.name
    INTO v_selected_id, v_selected_name
  FROM participants p
  WHERE p.id NOT IN (SELECT participant_id FROM draws)
  ORDER BY random()
  LIMIT 1;

  IF v_selected_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, true;
    RETURN;
  END IF;

  INSERT INTO draws (user_id, user_email, participant_id)
  VALUES (v_user_id, p_user_email, v_selected_id);

  RETURN QUERY SELECT v_selected_id, v_selected_name, false, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION draw_random_participant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION draw_random_participant(text) TO authenticated;
