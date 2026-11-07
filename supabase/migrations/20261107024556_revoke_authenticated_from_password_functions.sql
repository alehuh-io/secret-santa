/*
# Remove signed-in role access to password functions

## Summary
The sign-in and draw functions are called by the anonymous app, which checks
the password itself. Signed-in (authenticated) users are not part of this app,
so their access to these functions is removed.

## Security
- REVOKE EXECUTE on sign_in_participant and draw_match from authenticated.
- anon keeps EXECUTE, which the app needs.
*/

REVOKE EXECUTE ON FUNCTION sign_in_participant(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION draw_match(uuid, text) FROM authenticated;
