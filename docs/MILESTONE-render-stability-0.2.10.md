# Android rendering stability — 0.2.10 (version code 15)

2026-09-22. Latest failure recording was from the installed Android app. This is a repair candidate, not a claim of completed Pixel 7 qualification.

## Changes

- Bound GeoJSON tiling at zoom 16; close cameras reuse those tiles rather than continually generating tiny zoom-24 tiles. Keep zero geometry simplification for roads/routes. MapLibre documents source maxzoom in https://maplibre.org/maplibre-style-spec/sources/#maxzoom_3.
- Compare immutable feature content, not just object identity. Equivalent cached/network world copies no longer recreate the scene. Only changed map-source subsets receive setData.
- Preserve the vegetation atlas, materials, geometries and instance buffers across neighborhood updates. Replace the worker placement index and commit complete instance data when ready; dispose stale jobs without clearing the visible forest.
- Balanced/Battery use no dynamic shadow pass. High detail opts in. Do not toggle shader shadow variants automatically under load. This supersedes the automatic shadow-switch policy described in the 0.2.8 milestone.
- Reuse matched route history when a bounded long-replay window advances. Stable sample timestamps distinguish repeat visits. Changed coordinates, accuracy, gaps and backward seeks still invalidate the relevant suffix. Raw samples, accepted metrics and saved activities are not changed.

## Evidence and limits

259 tests passed, one skipped; TypeScript, web build and Android debug APK build passed. APK manifest verifies `app.keepleft.mobile`, code 15, `0.2.10-render-stability`.

Synthetic harness: ~3,200 buildings, 12,000 trees, 6,001 replay points, 4x playback, start at 450 seconds (past the 4,096-point window), real neighborhood replacement every 2.5 seconds. Use `?mode=follow&long&stream` or `?mode=chase&long&stream` with `npm run test:render`.

- Follow sample: p95 9.2 ms, worst 17.6 ms after startup; measured seek/pause input-to-next-frame 6.0–6.8 ms. Tree count remained 12,000. One 59 ms startup long task; no additional long tasks in the 53-second sample.
- Chase sample: p95 9.2 ms, worst 25.8 ms after startup; one 64 ms startup long task in 30 seconds; tree count remained 12,000.
- Typical route refresh fell from approximately 15 ms to 4–5 ms in the follow fixture. Neighborhood replacement still rebuilds the route index and can cost more. Regression test verifies an eight-sample window advance projects only eight new route points.

These are local desktop results, not Android FPS guarantees. No Android device was connected. APK still needs the same saved activity replayed on the Pixel 7, with pause, seek and zoom checks, plus a live recording test. Initial construction, very large neighborhood swaps and explicitly selected High detail can still cause hitches. Recording timestamps in a screen video alone do not identify the renderer bottleneck. GPS drift/zigzags remain a separate validation task.
