# Keepleft implementation plan

Keepleft is the user-facing name of the existing Atlas app. Internal source paths and the IndexedDB database identity remain unchanged to preserve saved runs.

2026-09-14 latest steering: freeze the noir UI and prioritize World Engine V2. Start with Vegetation V2, then one Day/Night WorldTheme, building semantics, landmarks, stats and sharing. See WORLD_ENGINE_V2.md. Android 0.2.1-noir is the preserved UI checkpoint (KEEPLEFT_UI_SYSTEM.md and MILESTONE-noir-world.md). Do not claim 99% reference fidelity or physical-device qualification from desktop screenshots. Previous feature sequencing below is retained as background.

Latest slice: Android 0.1.4-test addresses real-run route visibility and camera usability before new features: dark screen-width route lines, conservative local road alignment with an original-path toggle, explicit dashed short gap connectors, manual-angle-preserving tracking, a mobile touch-cancellation fix, and collapsible replay/activity details. See MILESTONE-route-camera-basics.md and ADR-008. It builds on 0.1.3's draggable/resizable photo overlay. Capture, saved activity totals and exports are unchanged; Pixel 7 acceptance of this update remains required.

This plan distills `PROJECT_ATLAS_Ultimate_TechSpec_PRD.md` into testable vertical slices. The source PRD remains the product authority; this file controls delivery sequencing.

## Current slice — Foundation and shared renderer

MVP1 scope update: prioritize the end-to-end activity flow. Dynamic GPS neighborhood loading, green mapped parks/gardens, and varied estimates for missing building heights are implemented. The user subsequently authorized bounded miniature detail, improved human motion, and live third-person mode. Mapped building parts and supported roof shapes, nearby procedural windows/trees, quality tiers, and camera-mode-preserving gestures are now implemented; see MILESTONE-miniatures-live-camera.md. Exact landmark models, traffic, cinematic lighting, and UI perfection remain deferred.

Status: geographic fixture, ENU/origin, opt-in web GPS, and completed-activity local storage implemented. The missing tile-worker integration is fixed and lake/roads/buildings have been visually verified in the browser. Target-device qualification remains pending. See MILESTONE-geographic-world.md and MILESTONE-web-gps-storage.md.

Deliverables:

- React/TypeScript web development shell.
- MapLibre geographic camera with a Three.js custom layer sharing the WebGL context.
- Restrained miniature-world material system.
- Instanced vegetation, reused materials, route buffer, synthetic runner, live controls and FPS HUD.
- Deterministic activity state tests.

Dynamic neighborhood loading, locality labels, and saved-run replay are now implemented. Replay has independent timing, play/pause, rate selection, seeking, and runner-follow mode. See MILESTONE-web-replay.md. In-progress checkpoint recovery is implemented in MILESTONE-recovery-and-scale.md. Native Android background capture is implemented for the first test; device qualification, terrain elevation and cloud services remain deferred. Browser recovery restores only the last successfully committed checkpoint; it does not guarantee background capture or lossless crash recovery.

## Next slices

Immediate next: qualify live capture, recovery, replay and native export on the Pixel 7. The next product slice is a focused finish summary with kilometre splits and clear replay/share entry points, followed by route/camera confidence and privacy controls. The revised product direction prioritises the individual running/share experience before cloud sync, health imports, cycling or events. Cross-app sticker copy/paste is explicitly deferred. Existing SQLite/IndexedDB storage stays authoritative locally; cloud choices will be revisited when accounts or shared events are in scope. Check live map feature counts to distinguish missing data from rendering bugs. Resolve dependency advisories before public release. Do not repeat already delivered slices below.

1. Geographic tile: introduce a local fixture containing roads and one building; normalize it behind the geo package boundary.
2. Terrain and origin: add local ENU conversion, floating-origin tests and a terrain fixture.
3. Hero motion: formalize synthetic location samples, filtering, interpolation, trail buffer and follow camera.
4. Real location: implement the web adapter first, then a native adapter contract without coupling it to React.
5. Reliability: checkpoint activities, pause/resume, recovery, dropout handling and privacy-safe instrumentation.
6. Replay: immutable activity snapshot, deterministic timeline, scrub and cinematic camera modes.
7. Production: PMTiles pipeline, device quality tiers, Capacitor background services, app-store privacy and performance matrix.

## Milestone gate

Every slice must pass type checking, unit tests, production build and a synthetic-route acceptance run. Rendering slices also report FPS, draw calls, geometry count and memory trend.
