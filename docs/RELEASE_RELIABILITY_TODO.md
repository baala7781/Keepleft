# V1 reliability work and handoff

2026-09-22. User requests Astra focus on difficult engineering; Gemini handles routine UI. Do not call the app release-ready until device qualification passes.

## Astra: current reliability slice

- [x] Suppress rejected stationary GPS movement in the native/web recording display; retain raw fixes and recorded totals.
- [x] Send activity type to Android capture, apply walk/run/cycle thresholds, and retain the type across save/recovery. Previously the native engine always used run limits. Legacy activities without type remain run; do not invent their original mode.
- [x] Make the first adaptive graphics fallback actually reduce rendering cost; respond to repeated stalls without oscillating quality.
- [x] Disable third-person entry points and automatic selection for every activity type. Avoid loading/updating the invisible animated athlete in other modes.
- [x] Move GIF quantization/compression off the UI thread with bounded memory, cancellation and failure handling. Correct GIF palette to the displayed crimson route.
- [x] Match Android video encoder dimensions to Story/Feed/Square and reduce per-pixel buffer overhead without reducing output resolution or frame rate.
- [x] Regression tests, production web build and Android APK. Physical-phone qualification remains below.
- [x] Diagnose remaining replay sideways excursions from the user's matching GeoJSON. The accepted 28-minute bike route has 1,211 points, no legacy delivery bursts, one genuine sharp turn and only three small local wobbles (largest 4.3 m). Large replay excursions were presentation errors: road matching could select a different parallel/service road at a segment restart. Cycling now keeps bounded visual smoothing but does not snap the route or marker to OSM centre-lines. Stored coordinates, distance and genuine turns remain unchanged.
- [x] Diagnose intermittent flicker against the follow-up 24-minute route. Its 1,231 accepted points contain only two continuous segments and no short lateral excursions, ruling out GPS as the flicker source. Remove runtime canvas pixel-ratio resizing, start Balanced at a stable 1.25 ratio, and skip unused road-presentation indexes for cycling/fast legacy replays at neighborhood swaps.
- [x] Reproduce that exact route through the web activity library and sweep all ten tile transitions plus its 14-second GPS gap at 4×. Desktop stayed at 120 FPS; the v0.2.13 regression was device-load specific. Android now starts Balanced at pixel ratio 1 (High capped at 1.25) instead of waiting for an in-play resize, and replay catch-up is bounded to 250 ms of wall time so a WebView/GPU stall cannot become a multi-second route/camera teleport. Saved timestamps and metrics remain unchanged.
- [x] Correlate the repeatable pause in the follow-up recording with its saved timeline. The route has a 14-second delivery gap whose stale fix moved only 1.34 m despite normal movement immediately before and after. Replay now compresses only that strong GPS-dropout signature and redistributes the removed time within the same continuous segment. Stored coordinates, totals, genuine stops and pause boundaries remain unchanged.
- [x] Correct the exported route diagnosis: the 14-second interval is a recorder-created segment boundary, not an ordinary continuous-sample gap. Raw segments remain unchanged; visual replay bridges only a short reconnect with nearby endpoints and confirmed movement on both sides. Replay startup no longer eagerly restores and publishes every route neighborhood; it activates the current world and quietly prefetches the next cached area.
- [ ] iOS native background recording, persistence/recovery and export parity. Existing shell is not equivalent to Android: it currently uses browser recording/storage.
- [ ] iOS simulator/device build and signing. Blocked: no usable Xcode located; user checking installation. Never label an unsigned/unbuilt shell an installable iPhone app.

## Gemini handoff: routine UI / content (not implemented in this slice)

- [ ] Create-post preview fits the available screen; all enabled metrics remain visible.
- [ ] Remove unwanted metric-card background; retain transparent standalone route GIF.
- [ ] Improve photo drag/resize affordances and touch bounds without changing export coordinates.
- [ ] Default demo to Kedarnath using actual matching fixture/terrain and attribution, not a renamed Madmaheshwar fixture.
- [ ] Onboarding, explicit permission explanations, empty states, accessibility labels and touch targets.
- [ ] Privacy/support pages, attribution screen, store screenshots and descriptions. Verify actual native/network data flows before making privacy claims.

## Shared release gates: physical testing, not desk-test claims

- [ ] Same saved replay: Follow/Orbit/Overview, seek/pause/exit, trees/roads; Pixel 7 plus a lower-memory Android.
- [ ] Walk/run/cycle: stationary start, turns, out-and-back, poor GPS, pause/resume, airplane mode, screen lock, revoked permission.
- [ ] Save/restart, app kill/recovery, offline route/world behavior, storage failure, backup/restore, migration and deletion.
- [ ] 30/60/120-minute battery/thermal tests and long cycling recording; iPhone matrix once native capture is implemented.
- [ ] Privacy/data-safety declarations and store requirements verified against current official guidance before submission.

Clipboard GIF compatibility is not universal. Do not advertise “paste animated anywhere”; keep explicit share/save fallback. Friends, accounts, leaderboards, health integration and extra scenery remain deferred.

## Validation notes

- Native Android: 19 unit tests passed, including activity-specific filter limits and padded/interleaved YUV rows. JPEG compression is now asynchronous on the web side; encoder frame size follows the selected preset at the existing resolution and 30 fps. Hardware encoding still requires a phone test.
- Synthetic browser GIF: 180 frames, transparent GIF89a, 297,399 bytes, 249 ms export and 9.2 ms worst frame interval in one desktop run. This is not a Pixel 7 speed claim. Reproduce with `npm run test:render` and `/tools/export-check.html`.
- Browser verified live camera menu has Aerial/Follow/Explore, running starts Follow, and replay offers Follow/Orbit/Overview. No Third person entry point.
- iOS: `npm run ios:sync` succeeds and copies current assets, including the GIF worker. No native recorder was added. No Xcode app was found in the standard Applications location or Spotlight; xcodebuild reports command-line-tools-only. Xcode/signing and native capture parity remain blockers.
- Android package remains `app.keepleft.mobile`; version code 21 / `0.2.16-reconnect-bridge`. Database identity/schema unchanged. Install over the existing app; do not clear data. This build can replay existing saved cycling activities; a new outdoor run is not required to validate these presentation fixes.
