# Session handoff: YourLeft / Keepleft (Atlas)

Last updated: 21 November 2026. Read this first in a new session, then `AGENTS.md`,
`.cursor/rules/replay-reliability.mdc` and `docs/KEEPLEFT_UI_SYSTEM.md`.

## 0. Latest session (19-21 Nov 2026): world look to match the user's reference images

The user supplied reference renders (day: cream buildings, mid-grey roads, light kerbs, olive trees,
no flat green ground; night: mid-grey buildings, warm lit windows, sparse street lamps with soft warm
pools on the ground). They judge only by side-by-side comparison with those images and were
frustrated by repeated hex tweaks that missed. Render, compare, and say plainly what colour cannot fix.

Done, uncommitted, checked only in the render harness (`npm run test:render`, port 3101,
`/tools/render-check.html?theme=day|night`), not in the app or on the phone:
- `lib/renderer/world-theme.ts`: day and night palettes and lighting retuned. Night building tint
  `#c4c2bf`, windows `#ffcf7a`. Day ground `#8b8a7c`, park `#647a38`, canopy `#506a2a`,
  daytime window glass `#4e5d66`.
- `lib/renderer/roads.ts`: day sidewalk colour `#c6bfae`.
- `lib/renderer/details.ts`:
  - Night street lamps: instanced dark pole, warm head and additive ground-glow plane; night only.
    `lampSegments()` and `placeLamps()` are exported and deterministic. Spacing 42 m on main roads,
    55 m on streets, alternating sides; none on footpaths, bridges or tunnels; cap 700.
  - Light floor ledges on nearby buildings (instanced boxes, cap 1500 balanced, 3000 high).
  - Offices and shops get wide glass bands instead of separate windows.
  - Unlit windows dim only at night; by day they read as glass.
- `lib/renderer/buildings.ts`: stair heads and water tanks now also on mid-LOD flat roofs and on
  footprints from 45 m² (was near-LOD only, 70 m²). Not visually confirmed: the harness camera is
  fixed (zoom 19, pitch 58) on a street of identical towers.
- Tests: new lamp placement test in `details.test.ts`; `world-lifecycle.test.ts` night ground colour
  updated. Renderer suite 119/119; TypeScript error count unchanged at 3. Harness scene about
  283k triangles at 120 fps.

Next (user approved starting it): a modelled building-piece kit, the only change likely to close the
gap with the reference. Shaped pieces fitted to OSM footprints: parapets, stair rooms, recessed glass
bays, ground-floor shopfronts. Rules: prototype in the harness behind an off-by-default switch;
produce one current vs kit vs reference comparison image and stop for approval before wiring it into
the app (see the user's earlier tree experience: a new tool with the same technique looked the same).
The harness needs a realistic low-rise Hyderabad block and an oblique camera parameter first; the
`public/fixtures/hussain-sagar` fixture was not yet inspected (the user stopped that step).
Bloom/AO glow seen in the night reference stays gated by WORLD_ENGINE_V2.md until phone profiling.

## 1. What the app is

- Android-first 3D run/walk/cycle tracker. The web app in `apps/client-web` is wrapped with Capacitor.
- Local only: no backend, no login. Saved activities live in IndexedDB (web) or SQLite (Android).
- Public map data (OpenStreetMap via Overpass) is fetched for the area around the user.
- Product names: "Keepleft" (repo), "YourLeft" (UI and legal pages). Keep the `atlas-activities`
  IndexedDB name; renaming it would hide existing user data.
- Current Android build: **0.2.21** (versionCode 26), APK at
  `apps/client-web/android/app/build/outputs/apk/debug/app-debug.apk`.
  Version string source: `apps/client-web/lib/version.ts` and `android/app/build.gradle`. Keep them in step.

## 2. Working rules for this project

- Follow `AGENTS.md`. Recorded truth, measurement truth and visual truth stay separate.
  Never change recorded distance, time or samples to make a path look better.
- Do not edit `replay.ts`, `replay-timing.ts`, `use-neighborhood.ts`, renderer lifecycle or
  quality budgets without asking the user first (`.cursor/rules/replay-reliability.mdc`).
- Never commit or bundle private GPS data, coordinates, or map caches. Analysis tools live in
  `apps/client-web/tools/private/` and that folder is gitignored. Check the built APK for leaks
  before handing it over.
- Do not touch `Untitled/` (stale duplicate) or `keepleft/` (empty git-only folder) without asking.
- `apps/client-web` has 7 pre-existing TypeScript errors (`story-placement-controls`, `world.ts`,
  `scene.ts`) and about 150 pre-existing lint errors. They are not from recent work. Do not
  count them as regressions; check that the count does not grow.
- The user prefers Opus for heavy development. Work one task at a time and report before the next.

## 3. Done so far

### Route display (road alignment) - fixed, phone test pending
- Root cause: `lib/renderer/route-presentation.ts` moved each GPS point on its own. Points that
  missed the road match were pushed off building outlines one by one, so neighbouring points went
  to different walls and the line zigzagged. Separately, the road lock was lost after a few metres.
- Changes:
  - Road-lock hold: a matched road is kept through short misses when it is still the nearest
    connected road in the direction of travel.
  - Road re-acquisition after a segment start or gap, requiring movement and a clear nearest road.
  - Building exit moved to the nearest outside point (smallest move), not a fixed 4.5 m push.
  - Trunk roads included (unless `foot=no`).
  - Short backward spikes (<= 4 m) dropped; real U-turns kept.
  - Junction rule: passing a crossing street stays on the road being travelled.
- Result on the user's 7 November scooter ride (453 fixes, 2,340 m): zero display points inside
  buildings (was 1 in the matcher output before the fix and 78 raw fixes); points off road
  108 -> 20; display breaks 8 -> 4.
- Tests: `lib/renderer/route-presentation.test.ts` (27 tests passing, includes new offset-street,
  building, junction, U-turn and gap-release tests).
- Tools: `tools/ride-analysis.ts` (pure maths, 7 tests) and `tools/private/analyze-ride.mjs`
  (reads a private GeoJSON, prints aggregates only, caches OSM under `tools/private/.cache`).
  `tools/private/render-compare.mjs` draws before/after SVGs; `trace-window.mjs` traces matcher
  decisions per fix. `ui-shots.mjs` + `spa-serve.mjs` take phone-size screenshots of the mobile build.

### Distance, time and speed analysis (Task 1 of the plan)
- Recomputed distance from the saved fixes matches the saved distance within 0.3%.
- The earlier "175 s unexplained duration" was a mistake in my first read of the file. The real
  gap is about 4 s (681 s saved vs 677 s last active).
- Speeds on the scooter ride: median 4.8 m/s, p95 7.5 m/s. 107 steps exceed the run profile's
  6 m/s spike threshold, yet those fixes were accepted and distance still matches the saved total.
- Fix gaps: seven gaps over 4 s, the longest 88 s. Not yet explained (traffic stop or lost signal).

### UI consistency pass - done, phone test pending
- New `apps/client-web/app/ui-system.css` (loaded last in `globals.css`) defines one control
  system: primary, secondary, quiet, danger, 44 px icon buttons, segmented tabs, option rows with
  radio circles, switches, checkboxes, section captions.
- Settings reorganised: View / Route display / Location / Your activities / About. Activity type
  is picked on the start panel only.
- Camera names unified to Follow, Orbit, Overview everywhere.
- Day/Night toggle removed from the map (in Settings > Lighting).
- Saved activities: card per run (Replay, Details, Export, Delete icon); "All your data" box holds
  export-all and delete-all.
- Home: Replay and Create post pair; activity count grammar; route drawing sits between date and
  metrics; footer links use shared style; Delete moved away from Replay in the detail popup.
- Stats: header shows "Stats"; filter label "All types".
- Create post (story studio): format tiles in a 2x2 grid, switch for "Hide the start and finish",
  play/pause on the preview, camera labels aligned.
- Replay: Play, Restart and Exit on one row, speed choice below.
- Run screen: after finishing, Replay run and Create post are the first row; Finish uses a stop icon.

### Skills installed (user level, not in the repo)
Installed to `~/.kiro/skills/` (18 `SKILL.md` files; test files removed):
- `karpathy-guidelines`, `context-budget`
- Elephant (EGM): `egm-bootstrap`, `egm-brainstorm`, `egm-draft`, `egm-drift-report`,
  `egm-resolve`, `egm-review`, `egm-review-loop`
- Superpowers: `brainstorming` (no visual-companion scripts), `writing-plans`, `executing-plans`,
  `test-driven-development`, `systematic-debugging`, `verification-before-completion`,
  `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch`
- Not installed on purpose: superpowers `using-superpowers` and its session-start hook (adds context
  every session); multi-agent superpowers skills; the other 313 ECC skills.
- Skills may need a new session to appear.

### Git state (nothing committed)
Modified: `.gitignore` (in client-web), `android/app/build.gradle`, `app/globals.css`,
`components/{activity-library,atlas-experience,camera-popover,keepleft-home,keepleft-stats,replay-controls,story-studio}.tsx`,
`components/ui/button.tsx`, `lib/renderer/route-presentation.ts`, `lib/renderer/route-presentation.test.ts`.
New: `app/ui-system.css`, `lib/version.ts`, `tools/ride-analysis.ts`, `tools/ride-analysis.test.ts`.
This file: `docs/SESSION_HANDOFF.md`.

Last full test run: 66 files passed, 321 tests passed, 1 skipped.
Last APK build: successful, version 0.2.21, no private tools or ride data found in assets.

## 4. Next steps (in order)

1. **Phone test (user).** Install the 0.2.21 APK over the current app, after exporting any saved
   activities. Check: the 7 November ride replay (route on road, no building entry); Settings
   (all pages); Saved activities; Create post; Home layout; Stats. Report with screenshots.
2. **Weak-GPS dots (open, needs a ride).** Isolated dots and out-and-back spikes on weak GPS have
   not been reproduced; the test ride had strong GPS. Need an export from a bad-GPS ride. Possible
   causes: a single bad fix accepted (also adds false distance); a display break leaving a lone point.
3. **Recording-time semantics.** Confirm what "duration" means (active vs. wall clock) and show
   GPS-lost time honestly. Small change; the gap on the test ride was only about 4 s.
4. **Speed and pace flicker.** Live speed resets to zero between GPS callbacks (`display-speed.ts`,
   `activity.ts`). Smooth without touching replay timing.
5. **Rejected-fix diagnostics.** Android saves only accepted fixes; the export omits the activity
   type. Add an optional local debug export (no raw coordinates in logs). This helps diagnose item 2.
6. **Create post structure.** Still one long scroll. Consider a two-step flow (choose format, then
   customise). Ask the user before changing behaviour.
7. **Old CSS cleanup.** `app/keepleft.css` and `app/reference-ui.css` contain many overridden and
   duplicate rules. Remove only after the phone test confirms the new look.
8. **Commit.** After the phone test passes, commit in logical pieces: route fix (+ tests and
   tools), UI system, skills docs. Do not commit `tools/private/` or the ride data.
9. **Later phases (need user approval):** 3D buildings, water and trees; human animation and
   customisation; Android Health Connect; offline behaviour; eventual database.

## 5. How to run things

```sh
cd apps/client-web
npx vitest run                          # unit tests (about 3 s)
npx vitest run lib/renderer/route-presentation.test.ts
npm run build:mobile                    # mobile bundle to dist-mobile
npm run android:apk                     # debug APK (needs JDK 21 and Android SDK)
node tools/private/analyze-ride.mjs "<path to private ride GeoJSON>"
```

Screenshot tooling (dev only): build the mobile bundle, serve it with
`node tools/private/spa-serve.mjs dist-mobile 4173`, then run
`node tools/private/ui-shots.mjs http://127.0.0.1:4173 <outDir> <steps.json>`.
Chrome must be installed at `/Applications/Google Chrome.app`.

Overpass (public OSM API) rate-limits some requests (HTTP 429). Retry after a short wait.
