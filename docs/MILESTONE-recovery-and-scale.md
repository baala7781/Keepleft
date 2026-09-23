# Checkpoint recovery and map-scale corrections

## Recovery

- Device-local IndexedDB schema v2 adds unfinished runs, preserving v1 completed activities. Recording requests a checkpoint every five seconds, on activity-state transitions, and best-effort on page hiding.
- A single writer coalesces slow saves. Revision checks ignore older snapshots. Explicit recovery claims ownership atomically; a competing writer pauses and reports the conflict instead of overwriting the run.
- Recovery leaves an active/paused run paused, preserves the original ID, time, distance and samples, and does not start GPS. Resume explicitly starts the provider and waits for an accurate fresh fix. The next recorded segment has a break; time while the app was closed is excluded. A stopped-but-unsaved run remains complete for final-save retry.
- Users may stop a recovered partial run without GPS to save and replay it. Final route, summary, and draft removal share one transaction. Failed final saving retains the recovery record. Successful saving disables further checkpoints for that runtime.
- Clearing browser storage still removes recordings. The recoverable boundary is the last successful commit, not a guarantee of zero data loss or a five-second maximum loss under all browser/storage conditions. Background and screen-locked capture are not implemented.

## Scale and live greenery

- The old authored runner was approximately 17 metres tall. Its bounding height is now normalized to exactly 1.8 metres with feet at local ground level. Gait bounce and route width were reduced accordingly. Follow mode zooms closer, with a separate small ground ring for locating the runner.
- Buildings remain in geographic metre units; they were not enlarged to compensate for the runner bug.
- Live queries and normalization now share greenery categories, including farmland, orchards, vineyards, plant nurseries, explicit land-cover vegetation, and grass-surfaced pitches. Unknown or hard-surfaced pitches are not painted green.
- Dynamic map controls show returned building/green/road/water feature counts and allow reloading nearby data. A zero-green response is labeled rather than presented as an unfinished load. Source coverage, large polygons outside the bounded query, and incomplete OSM mapping can still omit real greenery. The user's actual location has not been queried or inspected by the agent.

## Validation

72 tests pass across 13 files; type checking and production build pass. Tests cover schema migration, rollback, immutable drafts, stale revisions and owners, claim races, denied GPS, interrupted-run resume/finish/save/replay, coalesced writes, human/building scale, additional greenery tags, and the live GeoJSON fill-layer configuration. The existing localhost preview responds HTTP 200.

No fresh browser visual/performance acceptance or actual-device outdoor test was performed for this milestone. Prior FPS measurements do not qualify this updated renderer. The production build retains its large-chunk warning; existing dependency advisories remain a public-release gate. No deployment or visual redesign was performed.

## Follow-up: dot and third-person replay

The user requested a glowing orange dot in place of the tiny live avatar. A fixed-screen-size orange core and soft halo now mark location in live/aerial/free views; the 1.8 m human is shown in third-person replay. The marker is a single procedural point, not an enlarged person, and its resources are disposed with the map.

Replay defaults to a close chase camera, approximately 12 m behind the runner with a ground target 2 m ahead and 75° pitch. Zoom compensates for viewport height and latitude. Bearings follow the route by the shortest arc; replay endpoints preserve the last segment heading. Large seeks snap instead of sweeping across the map. Aerial, follow and free modes remain available; manual map gestures exit chase mode. Reduced-motion mode suppresses smoothing.

74 automated tests pass, including camera direction, responsive distance and dateline cases. This is an MVP third-person camera, not a game camera with building-collision avoidance. No fresh browser visual acceptance was performed for this follow-up.

## Follow-up: saved activity details

Completed IndexedDB records now open in a details dialog with distance, active duration, average pace, average speed, recorded GPS-point count, median accepted accuracy and route-segment count. Replay and export are available from the same view. The calculations are pure and never mutate the saved recording; zero-distance and long-duration records have explicit formatting. The interface explicitly describes the record as device-local.

76 tests pass across 14 files; type checking and production build pass. Cross-device persistence is deliberately not implied by this milestone. The next persistence tier is authenticated D1 activity metadata and route records, with IndexedDB retained as the offline-first recording source. R2 is unnecessary until Atlas stores large route exports or other blobs. Identity and sync-conflict rules must be defined before enabling cloud writes.
