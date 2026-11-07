/*
# Restore anonymous read access for the checklist

## Summary
The checklist reads participants and draws directly from the browser, but the
table privileges for anonymous visitors were missing, so the reads silently
returned nothing and nobody showed as having drawn.

## Changes
- Grants read access on participants to the anonymous role, limited to the
  name, family and creation columns (no password data).
- Grants read access on draws to the anonymous role, limited to the draw id,
  drawer id and time (the match itself is not exposed).

## Security
- The match assignment column and password hash are never granted to anonymous
  visitors, so no one can look up who another person drew from the browser.
*/

GRANT SELECT (id, name, family, created_at) ON participants TO anon;
GRANT SELECT (id, drawer_id, drawn_at) ON draws TO anon;
