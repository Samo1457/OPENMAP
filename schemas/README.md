Committed JSON Schema snapshots, one per Project `schemaVersion` (AD-9), generated from the Zod schema in `src/core/schema` by `npm run schema:snapshot`.

A committed snapshot is frozen. When the Project schema changes, `npm run test` fails until you bump `CURRENT_SCHEMA_VERSION`, add the `vN → vN+1` migration with a fixture test, and run `npm run schema:snapshot` to write the new version's file. Never edit or delete an existing snapshot.

v1 → v2 (Story 1.11) adds `pins.geo` (`{dataset, version}`), the geo dataset a Project is made with. The v1 snapshot stays; the migration in `src/core/schema` gives every stored v1 Project the `cliopatria@0.2.0` pin.
