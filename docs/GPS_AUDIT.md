# KeepLeft web GPS audit — 2026-09-20

This is the **pre-change baseline** for the web tracker. It does not describe Android's separate native capture service. Source: `apps/client-web/lib/tracking/location.ts`, `activity.ts`, `display-speed.ts`, `activity-stats.ts`, `storage.ts`, and `renderer/world.ts`.

| Question | Current implementation |
| --- | --- |
| Where is the watch created? | `WebLocationProvider.start()` calls `navigator.geolocation.watchPosition()`. `enableLocation()` starts preview; the same watch continues through an ordinary start/pause/resume. It is stopped on activity stop, demo switch, or disposal. Recovery can create a new watch. |
| Position options | Inline `{ enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }`. These are not yet configurable. High accuracy is a request, not a guarantee of GPS-quality fixes. |
| Browser fields retained | Timestamp, longitude, latitude, horizontal accuracy, altitude and platform speed. `altitudeAccuracy` and `heading` are not copied. |
| Raw/accepted storage | Raw callbacks are not persisted as a separate collection. Accepted fixes (including accuracy and timestamps) are saved to IndexedDB checkpoints/completed activities. Rejected positions and reasons are not retained. Display coordinates are not saved. |
| Accuracy gate | Invalid, future/old, duplicate and >50 m accuracy fixes do not enter distance. A fix up to 1000 m can still select an approximate map area. Quality UI currently uses `waiting/strong/fair/low/weak/stale`, with a 25 m good threshold and 30 s staleness threshold. |
| Distance | Haversine (`distanceBetween()`) between accepted fixes, summed only for unbroken segments. Gaps >20 s and confirmed relocations create a break with zero connecting distance. A better lock inside the old uncertainty radius is recorded as a zero-distance break. |
| Stationary jitter | A point is ignored for distance if displacement is below `clamp(0.5 × max accuracy, 3 m, 25 m)`. But stationary callbacks still replace the on-screen `currentFix`, which can visibly move the runner. |
| Speed | The snapshot initially computes accepted segment distance / GPS timestamp delta. `DisplaySpeed` then derives an 8 s rolling distance/time estimate and EMA for the UI. It resets to zero when no new distance is recorded, which can visibly pulse between GPS callbacks. Platform `coords.speed` is stored but not used. |
| Pace | Live pace is `1000 / displayed metres-per-second` when >0.25 m/s. Finished average pace is elapsed time / accepted distance. Below threshold, live UI shows `--:--`. |
| Duplicate/timestamp handling | `receiveFix()` drops timestamps no newer than the last reported fix. `GPSFilter` also checks duplicates, stale/future timestamps, and >20 s gaps. Delayed fixes from before recording/resume are ignored. |
| Activity profiles | Walk/run/cycle currently change maximum plausible speed (9/15/28 m/s) and fast-relocation threshold (4/6/24 m/s). They do not yet configure jitter, display speed smoothing, or GPS sample spacing as one profile. |
| Start behavior | Start requires a fresh `ready` position within 50 m reported accuracy. It does not require several stable fixes. The initial accepted point establishes the origin without distance. There is no explicit weak-lock override. |
| Poor signal | >50 m fixes pause distance accumulation and reset the segment while recording; signal return does not add the missing straight-line distance. The watch remains active. Accuracy 35–50 m can still be accepted. The runner can move on a `stationary` result. |
| Route matching/smoothing | Road matching and visual route smoothing run in the renderer/replay presentation. They do not change accepted samples, saved distance, elapsed time, or GeoJSON export. Original **accepted** samples remain recoverable; original **rejected/raw** callbacks do not. |
| World streaming | Nearby areas are preloaded and visited areas retained at reduced detail, with a local IndexedDB world archive. This does not guarantee coverage when a map area failed to download. |

## Highest-priority gaps

1. Separate a bounded, local-only raw diagnostic stream from accepted fixes and display coordinates. Define retention and explicit deletion; do not send raw coordinates to analytics or logs.
2. Hold the visual runner at the last trusted fix on stationary, weak, rejected or stale callbacks. Do not let approximate map discovery masquerade as recorded movement.
3. Make quality and activity thresholds configuration-owned, add deterministic poor-signal/known-distance traces, and validate speed/pace behavior between irregular callbacks.
4. Preserve the single-watch ordinary recording path and the existing separate native adapter. Do not move GPS capture into React or renderer frame updates.

No claim of Google Maps-level indoor accuracy is warranted for a browser. See `WEB_LOCATION_LIMITATIONS.md` for the platform boundary.
