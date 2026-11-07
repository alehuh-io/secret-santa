/*
# Enforce no same-family draws

## Summary
The draw function now never gives someone a person from their own family. It
also checks that every remaining person can still be matched, so the last
people in the exchange are not left with only family members to pick from.

## Changes
- `draw_match` now only picks targets from other families.
- Before confirming a pick, it checks that the remaining drawers can still all
  be matched with the remaining targets without breaking the family rule. If a
  pick would leave someone stuck, it is skipped.
- If a player has no valid pick but names remain, the function returns the
  status `blocked` instead of a match. If no names remain, it returns `none_left`.

## Security
- No change to access: the function is still callable by the app role only, and
  it still verifies the password first.
*/

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
  v_family text;
  v_match_id uuid;
  v_match text;
  v_candidate record;
BEGIN
  SELECT p.password_hash, p.family INTO v_hash, v_family
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

  FOR v_candidate IN
    SELECT p.id, p.name
    FROM participants p
    WHERE p.family <> v_family
      AND p.id NOT IN (SELECT d.participant_id FROM draws d)
    ORDER BY random()
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM (
        SELECT p.family AS fam, count(*) AS n
        FROM participants p
        WHERE p.id <> p_participant_id
          AND p.id NOT IN (SELECT d.drawer_id FROM draws d WHERE d.drawer_id IS NOT NULL)
        GROUP BY p.family
      ) drawers
      WHERE drawers.n > (
        SELECT count(*)
        FROM participants t
        WHERE t.id <> v_candidate.id
          AND t.id NOT IN (SELECT d.participant_id FROM draws d)
          AND t.family <> drawers.fam
      )
    ) THEN
      INSERT INTO draws (drawer_id, participant_id)
      VALUES (p_participant_id, v_candidate.id);

      RETURN QUERY SELECT 'drawn'::text, v_candidate.name;
      RETURN;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM participants p
    WHERE p.id <> p_participant_id
      AND p.id NOT IN (SELECT d.participant_id FROM draws d)
  ) THEN
    RETURN QUERY SELECT 'blocked'::text, NULL::text;
  ELSE
    RETURN QUERY SELECT 'none_left'::text, NULL::text;
  END IF;
END;
$$;
