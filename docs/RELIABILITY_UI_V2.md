# KeepLeft web reliability + UI architecture V2

## Scope completed

- `GPS_AUDIT.md` records the pre-change browser watcher, quality gates, distance, speed, pace, start, storage and visual-smoothing behavior. `WEB_LOCATION_LIMITATIONS.md` documents where browser positioning cannot promise native indoor behavior.
- Raw browser samples now remain with the local recording and checkpoint, separate from accepted distance-bearing samples. Lightweight history summaries, GeoJSON exports and story exports do not include the raw diagnostic trace. Deleting a saved activity removes its raw trace.
- Synthetic stationary, walk, run, cycle, city-noise, garage, jump and signal-loss traces exercise the quality gate. Activity profiles configure plausible speed, jitter, speed window, ahead-of-travel preload and runner follow rate.
- The on-screen runner holds its last accepted position through stationary and weak fixes. Distance pauses on poor fixes; a recovered segment is not blindly added as a straight line. Hybrid speed uses validated movement and corroborating platform speed. Very short movement does not produce a nonsensical average pace.
- A developer-only screen (`VITE_ENABLE_DEV_TOOLS=true`) displays fix counts, accuracy median/p90, raw versus measured distance, reported/derived/displayed speed, sample interval, rejection codes, map counts and renderer health. Coordinates stay hidden from this screen. Ordinary settings no longer display feature counts or GPS-point counts.
- The existing display-only road alignment and visual route smoothing continue to leave stored distance and samples untouched. The existing world corridor retains the starting area and preloads ahead; activity-specific preload now comes from the shared profile configuration.
- Camera selection is a KeepLeft popover. Mobile hides the six-button move pad and introduces a one-time gesture hint. Settings are short rows with camera, lighting, graphics, activity, recovery and library subviews. The mobile pre-run panel is compact; recording starts with the activity details collapsed.
- `/stats` is a responsive page backed by saved activities, with seven-day distance, activity frequency, a walk/run pace trend and device totals. Home history is a card-like route journal with lazy local thumbnails and short place titles.
- Share Studio now separates Photo Story and Route Sticker, keeps a live local preview, offers opt-in metric overlays, and removes the blue default canvas. The web Photo Story has 9:16, 4:5 and 1:1 presets; the existing Android exporter remains portrait-only because this milestone does not change native code. World Clip is identified as a later format, not a working export.
- Recovery can resume, end and save, or discard an unfinished activity. Discard requires an explicit confirmation, and both save and discard enforce draft ownership.

## Verification

- TypeScript type check, 223 deterministic tests (one skipped) and a production web build pass.
- Manual production-browser check covered desktop Stats layout, mobile Stats layout, mobile world HUD, camera menu and settings subviews. A desktop sticky-navigation overlap and an overlarge empty-state chart were corrected during that check. The freshly built `/run` page reaches a ready demo world at `localhost:3000`.
- No native Android/iOS code or build was created or changed in this milestone.

## Still to validate or build

- A browser cannot manufacture a trustworthy GPS field test. Check a stationary five-minute period, a measured walk, a 5–10 km cycle, and poor-signal recovery on real devices. Compare against another tracker and inspect developer diagnostics only with the owner's consent.
- Cinematic World Clip rendering is not implemented. Android's current native exporter remains portrait-only; Route Sticker remains a transparent GIF. Do not present the inactive World Clip format as available.
- The Stats page does not invent elevation or heart-rate data. Elevation profile and heart-rate charts await reliable recorded inputs.
- Full automated browser E2E and device performance tests are not yet present. Unit tests, a production build and manual browser interaction do not substitute for outdoor acceptance testing.
- `npm run lint` still reports existing repository-wide React-compiler, accessibility and library-file findings. This pass did not refactor unrelated files to clear that baseline.

## Real-world acceptance pass

1. Start outdoors only after the UI reports a usable GPS fix; record the reported quality if the start location seems wrong.
2. Remain stationary for five minutes. Expected measured distance: near zero, not slow drift.
3. Walk a measured route and compare accepted distance and pace with a reference tracker.
4. Cycle 5–10 km and inspect the runner, route, ahead-of-travel world and retained start area in replay.
5. Walk into a weak-signal area. Expected: runner held, weak-GPS state visible, no distance inflation, and a visual gap after recovery.
6. Check the same saved activity in History, Stats, Replay and Share Studio, then verify export and local recovery behavior.
