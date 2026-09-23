# KeepLeft miniature world — foundations roadmap

## Goal

Build a real-geography, stylized miniature world that is convincing from aerial, follow, and third-person camera views while remaining responsive on a phone.

The product direction is **animated architectural miniature**, not a photorealistic digital twin and not a raw map.

## Explicitly deferred

These do not belong in the foundations pass:

- human/avatar changes, rigging, or new character assets;
- cars, buses, cyclists, traffic, or traffic simulation;
- benches, tables, bollards, dense street furniture, and general prop libraries;
- large-scale landmark acquisition;
- full city-wide fidelity;
- native/mobile packaging work.

## Before implementation: outdoor baseline

Run one short real walk or run and retain the exported trace. Record a screen capture for:

- acquiring GPS;
- a normal road segment;
- third-person and follow camera;
- replay;
- a weak-signal moment if one happens.

This is not a development phase. It gives the world work a fixed real route for before/after comparisons and confirms that route correctness is not being traded for prettier rendering.

## Phase 1 — Road and route foundation

### Implementation checkpoint — 2026-09-20

Implemented semantic road widths (mapped width, valid lanes, then class fallback), bounded near-camera asphalt/sidewalk/curb/marking meshes, polygon-unioned junctions, and shared tree setbacks. Added a zoom-aware 3D route ribbon with rounded joins and explicit gap styling; recorded GPS and activity metrics are unchanged. Follow/chase obstruction protection resumes after gestures without removing the selected camera adjustment. Ordinary named buildings no longer clutter labels.

Validation: 230 tests passed, one existing test skipped; TypeScript and production build passed. Browser demo loaded in follow/third-person without rendering errors. The desktop fixture road-only patch measured battery 2,077 triangles / 199 KB / 35 ms, balanced 4,170 / 400 KB / 45 ms, high 7,509 / 721 KB / 62 ms. Four mesh objects; rebuilding is distance/quality gated, not per-frame. These are fixture construction measurements, not Android frame-rate claims.

Still required before phase acceptance: same-route phone visual/performance checks, day/night readability and dense-junction checks, and a restrained major-road/district label pass. Elevated bridge geometry remains Phase 3. No new avatar assets, props, or APK were included. Existing production bundle-size warning remains.

### Objective

Make movement feel grounded in physical streets rather than on thin GIS lines.

### Build

- central semantic road resolver and configurable road-class width model;
- near-camera road surface meshes for primary, secondary, residential, service, footpath, and cycleway roads;
- simple curbs and sidewalk strips only where the camera can see them;
- simplified joins for T-junctions, crossings, forks, and roundabouts;
- route ribbon V2: rounded joins, camera-aware width, restrained crimson emission, and reliable readability at day/night and every camera height;
- camera obstruction/framing guard that raises or pulls back instead of trapping the view in a building facade;
- reduce nonessential labels so road, district, major water, and route remain legible.

### Definition of done

On the same route, follow and third-person views show a road with real width and the route never disappears into generic map linework. Camera framing stays usable beside taller buildings.

## Phase 2 — Building and vegetation foundation

### Implementation checkpoint — 2026-09-20

Implemented semantic building profiles, presentation-only compression of generic estimated heights, round/dome roofs, restrained near roof coping, archetype-sized facade windows, and bounded near/mid/far building batches. Known heights, source footprints, courtyards, and building parts remain preserved. Four tree crowns now have distinct branching envelopes and secondary clusters; parks have denser seeded groves with clearings and existing exclusion rules. See ADR-012.

The 3,688-building fixture is mostly unclassified buildings with flat/default roofs. Additional roof shapes require source tags and are covered by synthetic geometry checks; the fixture is not a survey of roof detail. Near facade/roof improvements are visible at close zoom.

Measured building-only comparison: one full middle-detail batch 51,948 triangles / 6,857,136 attribute bytes; bounded balanced detail 52,948 triangles / 7,899,744 bytes including the far index and retained buffers. Four near + ten mid + one far batch, 8,237,136 peak bytes across the tested travel sequence; worst tile update about 4.2 ms on the desktop. Initial data construction and road-patch costs are separate. Phone qualification remains open.

Browser checks used the synthetic demo at desktop and 412×915 viewport sizes. Aerial and near views, gestures, day/night, and balanced/high settings rendered without console errors. Before the final grove adjustment, observed balanced views reported 120 FPS with 8 calls / 55,654 triangles aerial and 25 calls / 252,141 triangles near the park. These are desktop observations, not Pixel 7 results.

The quality-switch check also exposed a Phase 1 road union failure. Snapped, balanced union fallback now passes six demo corridor positions across all three tiers, including building exclusions. Ordinary fixture patches measured approximately 36–76 ms; the browser's previously failing patch rendered 4,322 triangles after an 81 ms rebuild with no reported failure. Difficult patches can cost more and still require device profiling. Final checks: 237 tests passed, one existing test skipped, TypeScript and production build passed. Avatar, props and native packaging remain deferred. Phase acceptance still needs same-route phone checks.

### Objective

Replace repeated gray blocks with a coherent, efficient miniature neighborhood.

### Build

- semantic building resolver with stable archetypes: house, apartment, office, commercial, institutional, industrial, fallback;
- height validation, levels-based fallback, and restrained visual-height compression for generic buildings;
- building-part reconstruction where source data has useful parts or min-height values;
- procedural roof silhouettes: flat, gabled, hipped, pyramidal, skillion, round, and dome;
- three building LODs plus far-map context; batch/instance static generic geometry;
- subtle near-only facade rhythm and deterministic night-window emission—no mesh per window;
- four or five low-poly tree archetypes; semantic density for parks, forests, gardens, roadside rows, and residential areas;
- deterministic vegetation placement that excludes roads, buildings, and water; near/mid/far tree LOD.

### Definition of done

The city reads as varied massing rather than a field of boxes. Parks feel denser and trees never sit in roads or buildings. Third-person views stay performant.

## Phase 3 — World identity and geographic anchors

### Objective

Give the same geometry a recognisable KeepLeft identity across day, night, and replay.

### Build

- one central KeepLeft `WorldTheme` system for Noir Day and Noir Night;
- stylized water surface and restrained terrain treatment;
- emissive window masks, limited landmark/near-camera light budget, and subtle near-canopy wind;
- first-class `LandmarkRegistry`, including attribution and LOD metadata;
- only two proof landmarks first: Hussain Sagar Buddha plus one second high-value Hyderabad landmark;
- a simple bridge semantic generator where the test route contains a bridge or water crossing;
- replay camera choreography that uses the improved world rather than adding a new avatar system.

### Definition of done

Day and night are clearly part of one KeepLeft world. Hussain Sagar is recognisable without photorealism, the route remains the hero visual, and replay shows composed shots rather than accidental map viewpoints.

## Phase 4 — Production hardening and city expansion decision

### Objective

Prove that the miniature world works along real movement corridors before extending it city-wide.

### Build

- validate active, preload, and retained route-corridor streaming against real traces;
- retain the start area and recent route context at replay LOD;
- quality tiers: Low, Medium, High, with device-safe defaults;
- draw-call, geometry, memory, and frame-time instrumentation available only in developer mode;
- repeatable visual checks in Hussain Sagar, Serilingampally, one dense urban area, a park-heavy area, and one bridge/water area;
- controlled OSM2World comparison to decide whether it materially improves preprocessing for roofs/building parts/roads. It does not replace the runtime stack.

### Definition of done

The app keeps a usable frame rate on a mid-tier phone, does not reveal raw/debug map geometry during streaming, preserves route history, and has evidence for whether expanding landmarks or improving procedural detail is the next best investment.

## Non-negotiable rules

- Recorded GPS, measured route, and visual route remain separate.
- Geographic identity is preserved; materials, lighting, and detail belong to KeepLeft art direction.
- Prefer stylized identity and frame rate over realism.
- Every phase is tested on the same regions, includes a production build, and records before/after frame-time and draw-call evidence.
