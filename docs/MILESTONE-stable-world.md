# Stable world / Day–Night foundation

2026-09-14. Android 0.2.3-tracking-fix, version code 9. Noir UI and all capture/storage identities retained. Further feature/art phases paused at the user's request until flicker and tracking are validated.

## Rendering correction
The supplied recording shows abrupt scene-scale jumps while the HUD stays fixed. Three's renderer cached the canvas viewport from construction. MapLibre later resized the drawing buffer (responsive layout / device-pixel ratio), while Three's shadow pass restored its stale cached viewport. Non-shadow frames used resetState's current canvas viewport, creating alternating scene scales. `renderSharedFrame` now synchronizes the cached viewport to the actual drawing buffer on every frame, without resizing the map-owned canvas.

Automatic camera commits now run on MapLibre's post-draw `render` event, after every layer has used the same camera matrix. Pixel ratio is set at map construction and from the quality control, never inside a custom draw or after a completed frame. The event listener and pending camera commit are removed with the world.

Tree zoom no longer resamples a smaller forest at zoom 16. One bounded population is retained across zoom; geometry LOD still changes with hysteresis. Atlas mipmaps prefilter tiny crowns, and billboards behind the eye are clipped rather than expanding across the viewport. This is not cross-faded LOD or a claim of zero shimmer on every GPU.

The newer 15:16 recording exposed a second, independently reproduced fault: distant tree billboard radius probes divided by near-zero homogeneous `w`, expanding into an opaque screen-filling sheet even while the demo was ready. Battery mode removed the symptom. Billboard vertices now stay in world metres and are projected only once, leaving clipping to the GPU. The same third-person zoom with Balanced trees enabled no longer blanks. The user subsequently confirmed the flickering was gone on the web. This is a rendering repair, NOT a new reference-matched tree art pass; existing canopy assets remain.

## GPS/replay correction
The private September 14 walk has 217 samples and 35 compressed delivery pairs. Android previously accepted competing fused and satellite streams and saved callback receipt time as active sample time. Native capture now prefers fresh accurate satellite fixes over competing callbacks, falls back after dropout, and timestamps points from monotonic measurement time. Browser capture also subtracts fix age and rejects delayed pre-resume points. Neither change touches existing stored runs.

Replay repairs measurement spacing in affected continuous segments while preserving segment endpoints, pause gaps and total duration. With display alignment enabled, repeated old paired deliveries retain the latest point per pair for presentation only. This heuristic is disclosed and can be disabled; it is not recovered ground truth or a rewrite of recorded distance. Original GPS exports and saved data remain unchanged. Photo-path coordinates remain raw, with corrected timing used for playback alignment.

Private local diagnostic (no coordinates emitted): 217 raw versus 182 display points; sharp direction reversals over 90 degrees reduce from 79 to 8. Maximum apparent raw delivery-timeline step speed was 637 m/s versus 14 m/s after measurement retiming (before optional display coalescing). These are diagnostic indicators, not verified walking speed or location accuracy. Remaining GPS errors and older distance inflation are not claimed corrected.

Third-person heading now derives from the same smoothed displayed position as the runner. Obstruction pitch has a 1.5-second clearance hold and bounded movement, preventing alternating building-edge clearance from rocking the view. Actual segment breaks reset the pose; stationary preview fixes no longer repeatedly masquerade as new segment starts. Manual framing remains respected; no building cutouts.

## Sharing
Explicit **Create social post** actions on completed runs, expanded replay details, the latest saved run on Home, and a saved run's detail dialog. The compact replay header still has its share icon. All open the existing local Story Studio; no new export format or upload service. Home closes run details before opening the editor to avoid stacked dialogs. The frontend-design skill guided consistent action wording and restrained placement, not a redesign.

## Previously started foundation (further work paused)
Manual Day / Night under Activities & settings → World lighting. Shared map paint, scene lighting/exposure, facade tint, canopy tint and deterministic warm windows. Noir daylight remains the default; preference persists locally and is used by the Home miniature. Changes retain the map, camera, geometry, instance buffers, replay and capture state. Windows use existing unlit batches, not a light per window. No new dependencies or asset downloads.

This is the Day/Night foundation, not the entire next phase: capped street fixtures, composed bloom/AO and sustained physical-device qualification remain outstanding. Automatic real-time lighting and geographically accurate artificial illumination are not implemented.

## Verification
- Final run: 188 JavaScript tests passed, 1 opt-in private test skipped in the ordinary suite; the private test passed separately with the supplied walk. 15 Android unit tests passed; TypeScript, production web/mobile bundles and APK assembly passed. Debug APK package `app.keepleft.mobile`, version code 9; previous signing identity retained.
- TypeScript and regression suite, including resize/shadow viewport restoration, post-draw camera ordering and listener cleanup, scene/material identity across lighting changes, unchanged runtime state, zoom-stable tree population and mipmapped atlas.
- Production web build, mobile bundle/sync and debug APK/native-test tasks.
- Desktop browser at 393 × 851: synthetic run → finish → replay → social editor, orbit playback, keyboard smooth zoom, expanded/collapsed details and Day/Night controls. Consecutive replay screenshots inspected; no captured WebGL errors. This does not replace the user's full-app or Pixel 7 test.
- Representative aerial sample: 120 FPS, 7 Three draw calls, 54,760 triangles, 1,405 trees, 16 geometries. Three-only counters, not total MapLibre work or a device benchmark; no sustained heap/heat/battery claim.
- Existing large-bundle warnings remain. No production publication or Play Store release.

Install the APK as an update without uninstalling or clearing app data. Pixel 7 acceptance: resize/rotate, repeatedly zoom in/out while replaying, switch Follow/Orbit/Third person, switch lighting during capture and replay, open a saved run's social editor, and confirm saved runs remain available.
