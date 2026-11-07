# 01 — Development and architecture

## Locations on the original Mac

- Repository: `/Users/baala/Documents/Codex/2026-09-06/fir/atlas`
- Application: `/Users/baala/Documents/Codex/2026-09-06/fir/atlas/apps/client-web`
- Shared geography package: `packages/geo` relative to the repository.
- Earlier delivered packages: `/Users/baala/Documents/ChatGPT/OYL`
- Xcode used for iOS: `/Users/baala/Downloads/Xcode.app`

These are local paths, not mandatory installation locations. On another Mac, substitute the new checkout/Xcode locations. The working-directory label in a chat is not necessarily the actual Git repository.

## What runs where

```text
React screens → activity runtime/store selected by platform
                    ├ web: browser GPS + IndexedDB
                    ├ Android: native service/engine + SQLite
                    └ iOS: Capacitor foreground GPS + IndexedDB

GPS → raw fixes → acceptance/measurement → saved activity
                       ↓ display-only processing
             replay/motion → road presentation → map/runner/trail

MapLibre: geographic camera and shared WebGL context
Three.js custom layer: buildings, trees, roads, route and marker

Geography: bundled demo OR cached/live OSM neighborhood
  web → /api/world → Overpass
  Android/iOS → Capacitor native HTTP → Overpass → local cache
```

Recording must continue independently of map loading and rendering. A map download failure is not a reason to lose GPS samples. React owns screen/domain state, not per-frame object animation.

The app is not a downloaded video or a full offline globe. The bundled JavaScript and assets execute on the phone. Nearby geography still needs internet the first time unless cached. There is no Keepleft account backend to start for native recording/replay. The website does need its web server/API runtime for `/api/world`.

## Source map

All paths below are relative to `apps/client-web` unless stated otherwise.

| Area | Entry points |
|---|---|
| Home, stats, live world | `components/keepleft-home.tsx`, `keepleft-stats.tsx`, `atlas-experience.tsx` |
| Native navigation and legal screens | `mobile/main.tsx`, `components/mobile-legal-page.tsx` |
| Website pages | `app/page.tsx`, `app/run`, `app/stats`, `app/privacy`, `app/terms`, `app/about` |
| Platform selection | `lib/native/platform.ts`, `bridge.ts` |
| Web/iOS activity state | `lib/tracking/activity.ts`, `location.ts`, `tracking-config.ts` |
| Android adapter | `lib/native/runtime.ts`, `storage.ts` |
| iOS adapter | `lib/native/ios-location.ts` |
| Native Android code | `android/app/src/main/java/app/keepleft/mobile/` |
| Saved activities/checkpoints | `lib/tracking/storage.ts`, `recovery.ts`, `checkpoint-writer.ts` |
| Replay timing and motion | `lib/tracking/replay.ts`, `replay-timing.ts`, `motion-source.ts` |
| Metrics/history | `activity-stats.ts`, `athlete-stats.ts`, `stats-period.ts`, `display-speed.ts`, `hybrid-speed.ts` in `lib/tracking` |
| Geographic normalization/network | `lib/geodata/osm.ts`, `service.ts`, `use-neighborhood.ts`, `lib/native/maps.ts` |
| World caches/prefetch | `lib/geodata/world-archive.ts`, `world-corridor.ts`, `world-prediction.ts` |
| World rendering | `lib/renderer/world.ts`, `map-frame.ts`, `shared-frame.ts` |
| Buildings/trees/roads | `building-world.ts`, `buildings.ts`, `vegetation.ts`, `tree-canopy.ts`, `roads.ts` in `lib/renderer` |
| Background preparation | `world-work-client.ts`, `world-work.worker.ts`, `background-work.ts` |
| Route display | `lib/renderer/route-presentation.ts`, `route-ribbon.ts`, `lib/tracking/visual-route.ts` |
| Social exports | `components/story-studio.tsx`, `lib/story/` |
| Theme/CSS | `app/globals.css`, `keepleft.css`, `reference-ui.css`, `lib/renderer/noir-palette.ts`, `world-theme.ts` |
| Demo geography/assets | `public/fixtures/`, `public/models/`, `public/licenses/` |
| Consent | `components/legal-consent-gate.tsx`, `lib/legal/consent.ts` |

`MapPlaneFrame` uses exact MapLibre Mercator projection in local metres at an anchor. Shared `LocalENU`/floating-origin utilities remain important, but do not replace the render frame with approximate ECEF tangent coordinates: projected roads and buildings must remain aligned.

## Fresh setup

1. Install Node >=22.13, npm, Git. Use the checked-in lockfile.
2. Open a terminal in the application directory.
3. Run `npm ci`. This recreates dependencies, not saved phone activities.
4. Run `npm run dev -- --port 3001` and use the URL printed by the server.
5. Approve browser location only if desired. Localhost is a secure-context exception; a plain HTTP LAN IP is not equivalent for browser geolocation.

Do not run `npm audit fix --force` or upgrade MapLibre/Three/Vite/Capacitor casually. Validate compatibility and replay after intentional upgrades.

## Command reference

```sh
# From apps/client-web
npm test
npx tsc --noEmit
npm run build
npm run build:mobile
npm run lint

# Production web build followed by local worker-runtime preview
npm run build
npm run start

# Dedicated synthetic render/export harness
npm run test:render
```

`npm run build` uses Vinext, not the standard Next.js build command. `npm run start` currently invokes Wrangler with `dist/server/wrangler.json`; use the printed address. A successful build does not deploy anything publicly. `npm run test:render` serves `/tools/render-check.html` and `/tools/export-check.html`; it does not itself assert physical-phone performance.

`npm run format` formats broadly: do not use it to make an unrelated small fix. Focus edits and inspect the diff.

## Mobile build chain

```text
source → build:mobile → dist-mobile
       → cap sync android/ios → native project's bundled public assets
       → Gradle/Xcode → APK/.app/IPA → install → phone test
```

Skipping sync is a common reason a new native build still contains old UI. A browser hot reload changes neither Android nor iOS bundles. `capacitor.config.ts` sets `webDir: 'dist-mobile'`, with no remote development server URL configured.

## Geographic and rendering boundaries

- MapLibre owns projection/camera. Avoid a competing Three camera controller.
- Reuse instance buffers/materials. A tree count increase is a GPU/memory decision, not just a CSS change.
- Prepare geometry off the main thread where supported; publish only the active world.
- Render resolution is stable at creation. Never repeatedly resize the canvas to react to FPS.
- Source coordinates, measurements and presentation are separate truths. Pretty roads must not rewrite workout metrics.
- Keep native capabilities behind adapters with synthetic tests; do not scatter platform checks through every screen.

## What a backend would add later

Accounts, cross-device recovery, friends, shared events, leaderboards, push notifications, remote config and centralized geographic delivery require additional service design. They are not obtained by merely building an APK. A production map pipeline may replace public Overpass with hosted preprocessed tiles; ADR-002/003/009 describe future directions, not deployed infrastructure.
