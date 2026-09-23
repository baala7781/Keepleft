# Web GPS and completed-activity storage — September 6, 2026

Implemented:

- Explicit opt-in browser location adapter and synthetic provider, with permission/timeout/accuracy feedback. Recording is not gated by map readiness. Real worldwide location acquisition does not imply worldwide map coverage: this world is still the bounded Hyderabad fixture.
- Filtering for invalid, stale, duplicate, low-accuracy and implausible fixes; no distance bridge across pauses or signal gaps. Activity time runs independently of rendering.
- Completed GPS snapshots retain stable activity IDs, timestamps, metrics and all accepted samples (up to the existing 100,000-sample recording cap). The renderer still uses only the most recent 4,096 samples.
- IndexedDB activity-store contract and synthetic memory adapter. Route and lightweight history summary commit atomically. Reads return isolated copies; listing does not load full coordinate arrays.
- Automatic save on stop; saved-activity history, GeoJSON download, confirmed local deletion, save retry, and an export escape path if browser storage fails. Demo runs are never added to GPS history.
- New activity/demo switching is guarded until the completed GPS recording is saved or the user initiates an export. A browser leave warning protects active or unretained GPS sessions where supported.
- Segmented GeoJSON preserves isolated fixes as Points, route segments as LineStrings, and timestamp/accuracy arrays.

Validation:

- Deterministic unit tests cover recording, pause/resume, filtering, provider cleanup, immutable completion snapshots, both storage adapters, database reopen, idempotent saves, deletion, transactional rollback and singleton exports.
- Browser acceptance checks covered actual map visibility and the demo start/pause/resume/stop/reset flow. The library empty state was visible. No device permission was requested by the agent; real-device GPS and saved-history UI with an actual recording still need a field test.
- Type checking and production build are required after this slice. The final build emits the MapLibre worker bundle.

Remaining reliability work:

1. Checkpoint in-progress samples and recover interrupted activities as paused. A tab/browser crash before Stop can still lose the activity.
2. Bound/paginate history, request persistent-storage retention where supported, and add schema migrations as the record evolves. Browser data clearing/eviction can still remove records; exports are backups.
3. Add native foreground/background adapters and on-device power/performance qualification.
4. Build deterministic replay, world streaming, terrain and the deeper cinematic rendering pass.

Release gate: a local `npm audit` on September 6 reported 19 dependency entries (9 high, 9 moderate, 1 low), including inherited framework/build-tool dependencies. No forced dependency upgrades were applied. Resolve and re-test these before exposing the app publicly. Counts are the audit snapshot, not an exploitability assessment.
