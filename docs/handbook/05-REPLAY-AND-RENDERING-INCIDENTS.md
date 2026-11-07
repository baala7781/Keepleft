# 05 — The flicker and pause investigation: preserve these lessons

The owner spent multiple days testing repeated replay faults. This document records why earlier fixes were insufficient and what finally produced a user-confirmed smooth replay. Do not restart that investigation by randomly lowering detail or clearing storage.

## First successful phone-validated checkpoint

`0.2.16-reconnect-bridge` was the first build reported by the owner as having **no pauses and no flickering** on the problematic 22 September saved route. This is a historical validation for that build/route/device, not a guarantee for every later build.

The permanent guardrail is `.cursor/rules/replay-reliability.mdc`. Read it before touching replay timing, streaming, camera/render lifecycle or adaptive resolution.

## Several different symptoms were called “flicker”

| Symptom | Evidence to inspect | Why it matters |
|---|---|---|
| Marker/camera stops then jumps at the same activity time | `activeElapsedMs`, timestamps, `breakBefore`, displacement around boundary | Often a timeline/segment artifact, not GPU overload |
| Whole scene changes or trees appear/disappear | Active neighborhood, world publications, geometry commits and LOD | Streaming/lifecycle issue can happen at a geographic boundary |
| Roads alternate grey/black, geometry shimmers | Coplanar layers, depth state, shared WebGL/projection | Can be depth fighting rather than GPS |
| Buttons/timeline also stall | Main-thread tasks, preparation, uploads, resize, export | UI thread saturation, not just animation styling |
| Long sideways excursion onto parallel road | Original vs displayed route and activity type | Snapping can create an error absent from GPS |

## What earlier attempts addressed—and could not address

1. **Geometry/quality work:** worker preparation, stable world updates and lower rendering budgets reduced load. They could not remove a pause explicitly encoded by replay's segment logic.
2. **Stable pixel ratio:** runtime canvas resizing was removed; Android Balanced started at ratio 1, High capped at 1.25 in the reliability slice. This avoided expensive WebView/GPU resize churn but did not change GPS timeline boundaries.
3. **Bounded replay catch-up:** replay clock advancement was capped at 250 ms of wall time per step so a device stall did not turn into a multi-second camera teleport. This treated stall amplification, not the deterministic hold itself.
4. **Continuous delivery-gap correction:** near-stationary stale deliveries inside a continuous segment were compressed for visual replay, with time redistributed to preserve total duration. The actual 14-minute problem was not inside a continuous segment, so this branch never handled it.
5. **GPS smoothing alone:** the follow-up 24-minute route had 1,231 accepted points and only two continuous segments, without the suspected short lateral excursions. That evidence did not support blaming raw zigzags for the repeated pause.

These changes were not necessarily useless; they solved different failure modes. The mistake would be treating all symptoms as one rendering-cost problem.

## The decisive finding

At approximately the 14-minute point, the recorder had created a **14-second segment boundary**, with endpoints only **1.34 metres apart** and movement before and after. Replay intentionally held at every `breakBefore` gap. Therefore ordinary interpolation and continuous-gap repairs could not affect this hold.

The successful correction separates saved measurement boundaries from the visual playback boundary:

- Retain saved samples, original segment boundaries, accepted distance, duration and metrics.
- Recognize only the bounded nearby reconnect signature with motion on both sides.
- Bridge that boundary for presentation and redistribute presentation time without changing total duration.
- Start replay with the current world only; silently prefetch the next cached neighborhood. Stop eagerly publishing all route neighborhoods during playback.

Relevant files: `lib/tracking/replay-timing.ts`, `replay.ts`, `lib/geodata/use-neighborhood.ts`, `world-corridor.ts`, `world-prediction.ts`.

## Current reconnect rules, so nobody broadens them accidentally

In `stabilizeReplayTiming`, a boundary is considered only with neighboring samples available, gap 2–30 seconds, positive adjacent durations, endpoint movement within `max(12 m, endpoint accuracies)`, and movement of at least 1 m/s on both sides. Eligible boundaries use 250 ms visual duration and redistribute removed time over ordinary intervals. Original ending time is preserved. Continuous-segment stale-delivery correction is a separate branch.

This is a heuristic, not knowledge of the person's intention. A future fix must protect genuine stops and pauses with tests. Never remove every `breakBefore`, compress all gaps, rewrite accepted fixes or recompute recorded totals from the beautified line.

## Cycling and parallel-road zigzags

The previous 28-minute bike trace contained 1,211 points, one genuine sharp turn and only a few small wobbles. Large sideways excursions arose from presentation snapping to a different parallel/service road at restarts. Cycling and fast legacy replay therefore remain off road snapping. Bounded smoothing still exists; actual turns/out-and-back must remain.

The 29 September building-aware matcher does not override that decision. Do not enable universal snapping as a shortcut to fix one walking route.

## Repeatable diagnostic protocol

1. Record exact app build, platform, activity type, mode, playback rate and activity time of fault.
2. Replay the same saved activity at 1× and 4×; compare Follow, Overview and manual camera. No new run is needed to test replay-only fixes.
3. Compare raw segment/timestamp evidence with displayed motion around the fault, without printing private coordinates.
4. Correlate neighborhood switches and canvas size changes; verify only one intended world is active.
5. Measure main-thread and GPU workload if the entire UI stalls. A fast desktop result does not clear a Pixel/iPhone WebView.
6. Change one justified subsystem, add synthetic regression, run tests/builds, then retest the exact phone replay.

Opt-in private diagnostic:

```sh
# From apps/client-web; input remains outside repository/public assets
KEEPLEFT_PRIVATE_RUN="/private/path/to/keepleft-recording.geojson" \
  npm test -- lib/tracking/replay-private.test.ts
```

This accepts the single-activity segmented export format and reports aggregates rather than coordinates. It is not a generic bulk-export importer or visual acceptance test. The old WhatsApp temporary attachment path was unavailable during the 29 September handover; the test was skipped. Do not claim that the exact private replay was retested when only synthetic tests ran.

## Non-negotiable regression rules

- No runtime canvas-resolution oscillation.
- No eager activation of every world along a replay.
- No heavy full-history matching or geometry rebuilding every animation frame.
- No React per-frame state cascade for marker motion.
- No third-person reintroduction in V1.
- No private diagnostic routes in web output, Android assets, APKs or Git.
- No FPS guarantee from screenshots, unit tests or a short desktop harness.
- Do not clear user storage to disguise a deterministic route-time defect.

Local/cache storage is not automatically the culprit because it is “50 MB.” Synchronous work, quota failures or cache lifecycle bugs can cause trouble, but the final historical pause was a reconnect/timeline issue. Diagnose the repeated timestamp first.
