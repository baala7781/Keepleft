# Miniatures, human motion and live third-person camera

Implemented 2026-09-07. Scope: improve the functional MVP without claiming reference-image fidelity or globally surveyed building detail.

## Delivered

- Preserve original mapped building polygons and courtyards. Building parts cut overlapping parent volumes; elevated parts retain the base below them. Source heights/minimum heights are respected after normalization; missing values remain estimates.
- Support flat, gabled, hipped, pyramidal and skillion roofs, with mapped direction/orientation where available. Unsupported shapes fall back to a flat roof. Roof and wall geometry is merged with vertex colors.
- Add bounded instanced facade windows and trees near the runner/view target. Windows are illustrative. Tree positions are procedural inside eligible mapped greenery, excluding holes and building/road buffers; no greenery is invented for unmapped areas.
- Replace the oversized authored runner with a roughly 1.8 m jointed figure, speed-dependent gait, opposing arm motion and two-bone leg placement. Respect reduced-motion preferences. Keep the glowing orange marker in other camera modes.
- Make Third person available during live GPS capture, demo capture and replay. Explicit camera selection survives automatic activity transitions. Map gestures retain the selected mode and save camera offsets instead of switching to Explore freely. Reset view clears those offsets without changing the mode.
- Collapse run options in Third person to leave more room for the scene. Add a map-only reload action after renderer failures without resetting capture.

## Detail budgets

- Battery saver: no decorative windows/trees, shadows disabled, pixel ratio capped at 1.
- Balanced: up to 2,400 windows and 120 trees within 170 m; pixel ratio capped at 1.5.
- High: up to 6,000 windows and 300 trees within 280 m; pixel ratio capped at 2.

Decorative detail is hidden below zoom 16 and refreshed after a 25 m target move or quality/LOD change. Instance buffers are reused; mesh geometry, materials and instance buffers are disposed when the map layer is removed.

## Verification

- 87 tests across 16 files passed, including roof bounds, courtyards, overlapping/elevated parts, camera-offset preservation, runner scale/gait, point-in-polygon holes, detail caps and buffer reuse.
- TypeScript check and production build passed. Build still warns about large chunks; dependency advisories remain a release task.
- Browser synthetic capture: Third person stayed selected after keyboard map panning. Browser replay: play, seek-to-end, restart and quality changes passed; final replay remained paused in Third person. Final browser error/warning log was empty.
- Demo observed around 30 FPS. Representative in-run sample: 20 draw calls, 56,770 triangles, 16 geometries, 1 origin shift, 1,532 map features, 101 ms world build. Another settled sample: 6 calls, 57,562 triangles, 15 geometries, 88 ms build. These vary with framing, culling and quality; they are not mobile benchmarks.
- Geometry reuse is unit-tested; a long-running browser heap/GPU-memory trend and repeated device stress run have not been qualified.
- Client build directory was approximately 7.3 MB uncompressed, including the local fixture. This is not an installed mobile-app size or a compressed initial-download measurement.

## Remaining limits and next work

Real outdoor GPS capture, touchscreen pinch/drag handling, sustained mobile thermals and battery usage still need physical-device acceptance. Terrain remains flat; the chase camera has no building collision avoidance. Exact landmark facades and unsupported roof forms are not reconstructed from footprints. A single reference image is not a source of accurate worldwide geometry.

Keep IndexedDB as the offline-first recording/recovery store. Qualify a real run through save/reload/replay, then implement authenticated cross-device D1 sync as described in ADR-009. No cloud sync or deployment was added in this slice.
