# World Engine V2

2026-09-14: the user's pasted plan freezes noir UI development and shifts priority to the miniature world. Working allocation: approximately 80% world generation, 10% analytics, 10% sharing, across successive milestones rather than parallel feature additions.

## Product thesis
KeepLeft turns the place you moved through into a living miniature world. It is not a road-navigation UI or a clone of another activity journal. GPS recording must continue independently of art, renderer load and map availability.

## Audit and implementation corrections
- Buildings already include supported roofs, building parts and minimum height. Their geometry is merged into one shared draw; replacing that with BatchedMesh is not automatically a win. Evaluate culling, mutable LOD and streaming before choosing a batching mechanism.
- Overture production ingestion is already an accepted ADR but not implemented. Introduce an offline bounded fixture/schema adapter and provenance/deduplication before a production pipeline. Do not ship large source datasets in an APK or silently union overlapping OSM/Overture footprints.
- Tree V1 has instancing but uses one silhouette and expensive aerial geometry. It needs semantic density, varied scale and genuinely cheap far detail.
- Day/night must update one world rather than reload the map or restart capture. Existing MapLibre/Three shared WebGL ownership makes a stock postprocessing composer nontrivial; bloom/AO are gated by correct shared-context composition and physical-device profiling.
- Landmark sourcing requires asset-level license/download verification, attribution, metric scale, georeferenced anchors, orientation, LOD and a footprint replacement rule. No inferred permission from a model title or screenshot.
- Existing local stats and photo overlays stay working. Do not add uncollected health/elevation data. Android export needs format/capability checks and native sharing; MediaRecorder support alone does not guarantee a social-ready MP4.

## Delivery order and gates
Vegetation V2 is implemented as the first slice in 0.2.2-world-v2; see ADR-011 and MILESTONE-vegetation-v2.md. No Day/Night, Overture ingestion, landmark assets or new export format is claimed in that build.

0.2.3-stable-world addresses the subsequently reported resize/zoom flicker and restores labeled social-post entry points. It also adds the shared Day/Night foundation (same-world palette, lighting, warm windows and remembered manual preference). Street fixtures and postprocessing/device gates remain open; see MILESTONE-stable-world.md.

1. Vegetation V2: four tree archetypes, deterministic clustered park/forest/garden placement, mapped tree-lined road rules, near/mid/far LOD, shader wind, reduced-motion/battery behavior, bounded reusable buffers and disposal. No forests on every green polygon; avoid pitches, open grass, farmland and residential areas without canopy evidence.
2. One Day/Night WorldTheme: same geometry, manual toggle, shared scene/map palette, exposure/environment, deterministic emissive windows, capped light fixtures. No light per window. Start without expensive postprocessing; qualify it separately.
3. Building V2: semantic resolver/provenance, Overture parts fixture, roof/min-height/height confidence, improved archetype silhouettes, culling/LOD benchmark. Preserve known geometry; never turn a generic footprint into a fictional surveyed tower.
4. Landmark Registry: start with one verified local landmark, asset attribution and LOD test, then expand Hyderabad coverage. Hide only matched generic building masses. Registry missing/error path falls back safely.
5. Stats V1: actual weekly distance, average pace, total time, longest run and recent history. Decide whether existing chart dependencies suffice before adding visx/Motion. Measured traces first; animated presentation second.
6. Share Studio V2: deterministic 6–12s World Clip, then Photo Story formats (9:16, 4:5, 1:1), selectable measured metrics and compatibility-tested export/share. Existing GIF is secondary, not removed.
7. Later: Health Connect, avatar/outfit presets, friends, live events, social features. No avatar customization in the world-engine milestone.

Each slice: deterministic tests, type check, web/mobile build, synthetic activity/replay acceptance, performance comparison. Pixel 7 sustained run/heat/battery and user visual acceptance remain separate release gates.

## Verified technical references
- [SeedThree](https://github.com/SkyeShark/SeedThree): MIT, alpha and WebGPU-first with a documented geometry/card/impostor chain. Study architecture; do not add it as a runtime dependency in the WebGL scene.
- [Kenney Nature Kit](https://kenney.nl/assets/nature-kit): the source page lists 330 CC0 assets. Potential source, not an assertion that its art direction matches the supplied noir references. No assets imported yet.
- [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html): repeated geometry/material with varying transforms.
- [BatchedMesh](https://threejs.org/docs/pages/BatchedMesh.html): different geometries sharing material; benchmark against the existing merged building draw, not against a hypothetical mesh-per-building baseline.

Other claims and links in the pasted proposal are research leads, not verified implementation promises. Verify each primary source when its milestone begins.
