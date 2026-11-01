/*
# Add family grouping to participants

1. Modified Tables
- `participants`: added two new columns:
  - `family` (text, NOT NULL, default 'Unknown') — the family/group name a participant belongs to.
    Used to prevent a drawer from drawing someone in their own family.
  - `email` (text, nullable) — the email address of the participant (used to identify
    which family the *drawer* belongs to, since each drawer signs in with their email).
    This lets the draw function look up the drawer's family and exclude their own family
    members from the pool of available names.

2. Logic Changes
- `draw_random_participant(p_user_email text)` updated:
  - Looks up the family of the participant whose email matches `p_user_email` (the drawer).
  - When picking a random undrawn participant, it now EXCLUDES anyone in the same family
    as the drawer. So a person can only draw someone from a different family.
  - If the drawer's email isn't found among participants, we fall back to excluding nobody
    (i.e., any undrawn participant is eligible) so the draw still works.
  - All other logic (atomicity, lock, existing-draw check, no-participants-remaining) is unchanged.

3. Security
- No changes to RLS policies or grants. The new columns are covered by the existing
  SELECT grant on `participants` for `authenticated`.
*/

-- Add family and email columns to participants
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS family text NOT NULL DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS email text;

-- Helper index for looking up a participant by email (used in the draw function)
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants (email);

-- Recreate the draw function with the family-exclusion logic
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
  v_drawer_family text;
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

  -- Find the drawer's family so we can exclude their own family members
  SELECT family INTO v_drawer_family
  FROM participants
  WHERE email = p_user_email
  LIMIT 1;

  -- Lock draws to prevent concurrent double-draws
  LOCK TABLE draws IN ACCESS EXCLUSIVE MODE;

  -- Pick a random undrawn participant NOT in the drawer's family.
  -- If we couldn't determine the drawer's family (no matching email), v_drawer_family
  -- is NULL and the AND clause is skipped, so any undrawn participant is eligible.
  SELECT p.id, p.name
    INTO v_selected_id, v_selected_name
  FROM participants p
  WHERE p.id NOT IN (SELECT participant_id FROM draws)
    AND (v_drawer_family IS NULL OR p.family <> v_drawer_family)
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
