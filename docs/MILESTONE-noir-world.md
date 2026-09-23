# Noir UI checkpoint — 2026-09-14

Android 0.2.1-noir (version code 7). The user rejected mint and supplied three noir/crimson reference screens. This is the completed UI checkpoint before the subsequent World Engine V2 request. It is not a claim of 99% reference fidelity.

## Delivered
- Shared charcoal/crimson UI and world materials, local type, pale building masses, dark water, crimson route/marker and runner outfit.
- Lobed instanced trees with crown shading and procedural surface mottling; aerial visibility, mapped-polygon placement and road/building/water exclusions.
- Scene-backed home, one demand-rendered WebGL preview, in-memory poster reuse, honest empty-history/demo treatment.
- Run-ready HUD, compass, replay view rail, run-specific replay header and actual Share action.
- Whole-run summary separate from playback progress; collapsible dock; measured clearance keeps replay rail out from behind the dock. Third person remains accessible through More views and settings.
- No fabricated health stats, profile destinations, landmarks or GPS connection claims. No building cutaway effect.
- Capture algorithms, activity database identities, native foreground service and saved measurements unchanged.

## Checks
- TypeScript passed; 169 tests across 34 files passed.
- Web production build, mobile bundle and Android debug assembly passed. Native unit-test task succeeded (existing tests were up-to-date).
- Browser exercised synthetic start, pause, stop, replay, play/pause, camera selection, collapse/expand and settings. No real GPS recording was started.
- Browser layout checks at 461px and 393px width: no document horizontal overflow; measured replay rail/dock clearance. Physical Pixel 7 touch/sunlight testing remains pending.
- Existing MapLibre/Three large-chunk warnings remain.

## Desktop rendering baseline for V2
Before the noir foliage pass: 120 FPS, 3 Three draw calls, 51,950 triangles, 0 aerial trees, 6 geometries.
Noir checkpoint aerial view: 120 FPS, 4 Three draw calls, 959,150 triangles, 1,800 trees, 7 geometries.
These are local desktop samples, not sustained Pixel 7 results; draw counts exclude MapLibre's separate render work. Unit tests verify geometry reuse across detail updates. No sustained heap/battery qualification was performed.

The tree triangle increase is a V2 optimization target: repeated far crowns were still about 504 triangles each. Geometry count remaining bounded is not equivalent to a complete memory-leak proof.

## Boundaries
Flat terrain; real OSM geometry with estimates where height metadata is absent. Tree placement/density is illustrative, not surveyed. The bundled Hussain Sagar fixture differs from the locations depicted in the user's references. No authored landmark assets, Overture ingestion, day/night or World Clip export in this checkpoint.

Installable checkpoint: /Users/baala/Documents/ChatGPT/OYL/outputs/keepleft-0.2.1-noir.apk. Install as an update to retain local runs; do not uninstall first.

## Subsequent steering
The user's pasted World Engine V2 request freezes this noir UI direction. Continue with vegetation, then shared day/night materials, then building semantics, landmarks, analytics and sharing, in measured vertical milestones. See WORLD_ENGINE_V2.md.
