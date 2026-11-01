/*
# Allow anon to read participants list

The login screen needs to show the name dropdown BEFORE the user is authenticated
(they pick their name + email to claim and sign in). The participants table only
granted SELECT to `authenticated`, so the dropdown was empty for logged-out users.

- GRANT SELECT ON participants TO anon — anon can now read the roster.
- Add a SELECT policy for anon (mirrors the existing authenticated policy).
  RLS still applies: anon gets SELECT only, no inserts/updates/deletes.

This is safe: participants contains only name + family + email (email is null
until claimed). The roster of names is intentionally public for this app.
*/

GRANT SELECT ON participants TO anon;

DROP POLICY IF EXISTS "anon_read_participants" ON participants;
CREATE POLICY "anon_read_participants"
  ON participants FOR SELECT
  TO anon USING (true);
