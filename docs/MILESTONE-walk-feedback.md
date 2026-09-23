# Pixel walk feedback — 0.1.1-test

## Findings

The user supplied a real exported walk for local diagnosis. It was read locally only and was not copied into the repo, uploaded, or altered. No precise coordinates were logged or used in screenshots/tests.

- 197 points, five segments, approximately 10 min 15 sec; exported distance 869.77 m.
- No duplicate timestamps or identical successive points. Summed segment lengths match the exported distance; there is no evidence of simply summing the same sample twice.
- Several abrupt reversals and implausible walking bursts, including a 42.7 m step in 3.3 seconds. The median reported radius is about 4.4 m, but that is a device estimate, not proof that every point is accurate. The export does not preserve source-provider IDs or rejected original fixes, so the actual path and the cause of each excursion cannot be proven from it.
- Native callbacks reset instantaneous speed to zero on stationary/noise-filtered updates. That explains the displayed speed intermittently dropping between accepted movement points.
- High-zoom browser QA reproduced an independent visual offset: ellipsoidal ENU and MapLibre's spherical projection were mixed in the render transform. This affected alignment even without GPS noise.

## Changes

- Recent speed: eight-second distance/time window with a short display transition, bounded sampling frequency and immediate reset for pause/completion or unavailable GPS. It can take about eight seconds to reach zero after a genuine stop. UI says “Recent speed / smoothed”. Works for live capture and non-demo replay. Saved samples and total distance are not changed by presentation smoothing.
- Stable heading: ignore sub-5-to-12-metre direction changes based on reported uncertainty and limit automatic rotation to 35 degrees/sec. Third-person starts farther back and higher (62-degree pitch) and remains freely adjustable.
- Amber/white beacon with dark outline in all modes; amber runner shirt while preserving the blue application controls. Beacon remains screen-sized and visible through geometry.
- Depth-aware clean cutaway in front of the runner in third-person view; no extra building mesh/pass, no invented road snapping. Camera can still be deliberately panned away; Reset view restores the selected preset.
- Exact map render frame for buildings, detail, trail and camera, with atomic floating-origin shifts. True ENU remains in domain/geodesy calculations. See ADR-004.
- Android prefers a fresh accurate GPS-provider fix over network-provider updates for ten seconds. Network remains available before satellite acquisition or after dropout. Turning off one provider no longer falsely reports that all Location is off when another is enabled.
- Both filters reject an isolated sudden excursion based on recent pace. Two consistent relocated fixes begin a new segment without joining distance. Synthetic tests retain a genuine return along the same road. This conservative policy can omit legitimate abrupt accelerations or uncertain stretches; it does not guarantee exact road alignment.

## Verification

- Type checking, 121 web/shared unit tests, eight Android filter/source tests, web/mobile builds and Android lint passed (existing warnings remain). New helper source lint passed.
- Re-filtering the provided accepted-point export rejects four suspect points. The result is diagnostic only, not a corrected/ground-truth distance; the original export and saved activity remain untouched.
- Synthetic browser fixture at 390 × 844: third-person preset, visible beacon at max zoom, manual angle retention, and an obstruction with a building between camera and runner checked. No private route screenshot was taken.
- Projection tests compare rendered coordinates directly with MapLibre at multiple latitudes, across a neighborhood, after rebasing, and near the dateline.
- Workstation browser demo: 120 FPS, 21 draw calls, approximately 55,800–56,900 triangles; geometry count stayed at 16 while origin shifts advanced from one to three. World build measured 48 ms; no captured renderer errors. This is not a phone FPS or total-memory benchmark.
- Physical Pixel 7 qualification of the new APK, GPU/heat/battery behavior, native callbacks during screen lock, and true walking-distance accuracy remain pending. General repository lint/dependency advisories from the prior milestone remain open.

## Retest

Install 0.1.1-test over the existing app, without uninstalling or clearing storage. Same package ID, same debug signing key, incremented version code; SQLite schema unchanged. Export a backup first if desired.

Walk briefly, pause, stop, and walk the same out-and-back once. Check that Recent speed is steady during motion and drops after stopping; third-person turns calmly; the beacon is visible when close; and replay does not invent sharp side trips. Existing recordings are not retroactively repaired and may still show their original GPS excursions.
