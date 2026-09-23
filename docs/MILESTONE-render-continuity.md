# Render continuity — 0.2.8

2026-09-22. Rendering reliability is the priority; the requested home/post layout changes remain deferred.

- Vegetation overlap resolution uses geographic seed order, not distance to the moving camera. Distant cluster cards retain their coverage instead of collapsing into individual trees on an LOD change.
- A replacement neighborhood inherits visible tree instances. Browser scene preparation spans multiple animation frames and commits only when complete; cancellation releases unfinished resources and leaves the existing scene intact.
- Reordered, unchanged corridor features no longer rebuild the scene or retile map sources.
- The map is the single asphalt surface. Three adds sidewalks, curbs and markings; a moving, separately shaded asphalt patch no longer covers it.
- Route geometry retains a GPU buffer and updates the changed suffix; moving the tip does not recreate/project/upload the whole prefix.
- Replay scrubbing pauses playback, previews the selected time locally, and seeks once on release. It resumes only when playback was active before the gesture.
- Shadow refreshes are bounded to twice per second (origin rebases refresh immediately). Sustained slow frames first disable shadows, then cap pixel ratio at one. Isolated stalls do not trigger quality changes; quality does not oscillate upward/downward during the scene. Tree population is retained.
- Diagnostics no longer query/copy all map source features every second.

## Verification

Typecheck, full tests and web/Android production builds. Regression coverage includes long-route buffer reuse and breaks, stable tree identities during movement, tree inheritance, staged replacement/cancellation, unchanged world detection and sustained-pressure quality decisions.

Repeatable browser harness: from `apps/client-web`, run `npm run test:render`, then open `http://127.0.0.1:3101/tools/render-check.html` (append `?mode=chase` for third person). It uses synthetic coordinates, about 3,200 buildings, 12,000 trees and 4× replay; controls force a real world replacement, seek and pause. Timing excludes the first six seconds for frame percentiles, but long-task counts include startup. No real GPS data is required or logged.

Desktop third-person sample: 120 FPS, approximately 9.2 ms p95, 33.3 ms worst frame including a forced replacement and seek; seek input-to-next-frame 4.1 ms. One 59 ms startup task; no additional long tasks in the 88-second sample. Before staging the replacement, its measured worst frame was 58.3 ms. These are local desktop measurements, not phone performance guarantees. Pixel 7 and other mobile GPUs still require replay/live qualification with the new APK; initial scene construction can still produce a loading hitch.

Raw GPS, accepted fixes and recorded activity metrics are unchanged. Remaining GPS zigzags are a separate issue; this update does not claim to eliminate measurement noise.
