/*
# Add claim_participant function

1. New Functions
- `claim_participant(p_participant_id uuid, p_email text)`:
  Atomically binds an email to a participant name. This is the "first-time login"
  association: the user picks their name from a dropdown and enters their email,
  and this function permanently attaches the email to that participant.

  Logic:
  a. If the participant row already has THIS email → return success (returning user).
  b. If the participant row already has a DIFFERENT email → return error
     "taken" (name is taken, can't reassociate).
  c. If the participant row has no email yet → set it to p_email and return
     success "claimed" (first-time claim).

  SECURITY DEFINER so it can update participants.email even though the frontend
  has no direct UPDATE grant. Uses SELECT ... FOR UPDATE for row-level locking
  to prevent race conditions.

2. Security
- SECURITY DEFINER, search_path = public.
- REVOKE EXECUTE from PUBLIC; GRANT to anon + authenticated — callable before
  the user has an auth session (claim happens on the login screen).
*/

CREATE OR REPLACE FUNCTION claim_participant(p_participant_id uuid, p_email text)
RETURNS TABLE (
  success boolean,
  status text,
  participant_name text,
  participant_family text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_email text;
  v_name text;
  v_family text;
BEGIN
  SELECT p.email, p.name, p.family
    INTO v_existing_email, v_name, v_family
  FROM participants p
  WHERE p.id = p_participant_id
  FOR UPDATE;

  IF v_name IS NULL THEN
    RETURN QUERY SELECT false, 'not_found'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_existing_email IS NOT NULL AND v_existing_email = p_email THEN
    RETURN QUERY SELECT true, 'already_claimed'::text, v_name, v_family;
    RETURN;
  END IF;

  IF v_existing_email IS NOT NULL AND v_existing_email <> p_email THEN
    RETURN QUERY SELECT false, 'taken'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  UPDATE participants SET email = p_email WHERE id = p_participant_id;

  RETURN QUERY SELECT true, 'claimed'::text, v_name, v_family;
  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_participant(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_participant(uuid, text) TO anon, authenticated;
