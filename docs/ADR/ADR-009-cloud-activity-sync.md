# ADR-009: D1 for authenticated activity sync

Planned, not yet implemented.

IndexedDB remains the authoritative first write during browser capture so recording does not depend on network availability. It already persists completed activities and recovery checkpoints across refreshes and browser restarts on the same browser profile.

After the local GPS/recovery/replay flow passes target-device qualification, Atlas will add authenticated cloud sync. Cloudflare D1 will store user-owned activity records and coordinate sync revisions. Server writes require an authenticated owner; Atlas will not upload anonymous GPS history or invent device identity as a substitute for an account. Sync must be idempotent, preserve the immutable raw route, represent deletion conflicts explicitly and keep capture working offline.

R2 remains disabled until a demonstrated need exists for large binary exports or media. GeoJSON can be generated from the structured route record rather than stored as a duplicate blob during the first sync milestone.
