# Keepleft: branding, camera freedom and GPS confidence

## Delivered

- Renamed visible branding, page title, recovery messages and route export names to Keepleft. Kept the existing `atlas-activities` database name so the rename does not abandon saved activities. No cloud migration or upload occurred.
- Electric-blue marker glow, blue route and runner shirt, midnight-blue controls, compact options panel, centered activity metrics and always-available zoom/rotation/tilt buttons. The Sites skill guided shared theme tokens and the map-first layout.
- Explicit mode switches retain current center, zoom, pitch and bearing. Orbit rotates around that chosen focal point; follow/chase use offsets relative to the moving runner. Reset view is now the separate preset-restoration action. All modes allow manual exploration.
- Camera automation suspends on pointer-down, remains suspended through multi-touch and inertia, then captures the user's framing. Selection does not change during gestures. Touch rotation is explicitly enabled.
- Retained high-accuracy geolocation requests with no cached positions. Usable fixes are accepted through a reported 50 m radius; 26–50 m is labeled connected with standard accuracy and uses a larger jitter dead zone. Distance pauses above 50 m. Fixes become stale after 30 s. Earlier 25 m/10 s and 20 s freshness policies proved too strict in live browser use and were corrected. Starting a recording requires a fresh usable fix.
- A significantly better lock inside the previous uncertainty radius is treated as a position refinement, not distance travelled. Weak fixes interrupt distance continuity, preventing a straight-line bridge across unreliable reception. This conservative policy may undercount weak-signal stretches.
- Nearby-map loading is independent of distance tracking. A fresh approximate fix up to a reported 1 km radius can select and fetch the local neighborhood, while the runner and distance still wait for a fix within 50 m. Extremely coarse fixes are not used for either purpose.
- Visible GPS quality distinguishes strong (reported radius <=10 m), fair (<=25 m), weak and stale. Latest reported accuracy updates even if the position is rejected, rather than displaying an old good number. A bounded, reused blue circle shows the last usable fix's reported radius in the map's metre coordinate system.

## Verification and limits

95 deterministic tests passed, including all existing storage/recovery/replay tests and new camera gesture, camera transition and GPS quality cases. Type checking passed. The local route responded HTTP 200. No new browser interaction or physical-device benchmark was performed in this slice; touch-device acceptance remains pending. The accuracy circle adds one bounded geometry, with disposal through the existing layer cleanup.

Geolocation accuracy is a device-reported horizontal radius with a 95% confidence level, not guaranteed exact position: https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy . High-accuracy mode is already requested; it cannot manufacture better measurements: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API/Using_the_Geolocation_API . Building footprints and GPS have separate source errors. No lane-level accuracy, road snapping, or background browser capture is promised.

Next acceptance: on a physical phone, pan/pinch/rotate in each mode, switch modes while zoomed, reset the view, then record a known outdoor route and compare distance and trace against a reference. Save, reload and replay it. Keep browser foreground; native background tracking remains a future adapter task. Existing dependency advisories and large-chunk build warnings still require release work.
