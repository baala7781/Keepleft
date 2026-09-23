# Web tracking and replay milestone

MVP1 remains functionality-first. No detailed facades, cinematic assets, or UI redesign were added.

## Delivered

- Dynamic neighborhood responses include available administrative locality names. The lookup uses the approximate requested map-cell center, not an extra exact-location request. Missing names are labeled honestly.
- GPS samples retain activity elapsed time, so playback distinguishes recording time from paused wall-clock time. Older records remain readable with an approximate-timing notice.
- Saved activities open in an independent replay runtime: play/pause, 0.25–4× speed, seek, restart, exit, and following camera. Replay does not start GPS, mutate the original samples, or create a new recording.
- Replay preserves route breaks, holds position through missing coverage intervals, and avoids drawing fabricated connections. A demo replay allows permission-free testing.
- Neighborhood caching and empty local map placeholders let the route remain usable while new map data loads or fails. New geographic content still requires network access.
- Live GPS displays accuracy and update age. Rendering smooths visual motion without modifying recorded coordinates.

## Verification

- 55 automated tests pass, including pause/gap timing, seeking, speed changes, legacy records, immutable samples, dateline interpolation, bounded trails, and save/reopen/replay integration.
- Type checking and production build pass. The build still reports a large client chunk warning.
- The actual neighborhood endpoint returned HTTP 200 with 1,180 features and an administrative locality label for a public Hyderabad test cell.
- Browser acceptance: start demo, pause/stop, open replay, play at 4×, pause, seek to end, restart, and exit. Metrics and route advance; controls fit the narrow viewport; replay rendered at approximately 30 FPS. No browser console errors were returned during this check.

## Remaining qualification

An actual outdoor run outside Hyderabad has not been performed by the agent. Verify permission, local naming, GPS accuracy, pause/resume, completed-run persistence after reload, and replay on the user's target device. Web recording requires an active page and a secure origin; background/screen-locked capture is not guaranteed. Interrupted in-progress recovery was added in the subsequent MILESTONE-recovery-and-scale.md. Existing dependency advisories remain a gate before public release. This is a local MVP, not a production qualification claim.
