# ADR-011: Semantic, instanced vegetation with a WebGL LOD chain

Accepted 2026-09-14 for the first World Engine V2 slice. The noir UI is frozen; this changes world generation only.

## Decision
Separate semantic placement, tree geometry/atlas generation and GPU batches from building-window detail. Keep all modules local, deterministic and independent of GPS capture/network/React frame updates.

- Four metre-scale authored archetypes: broadleaf, wide shade, narrow columnar and ornamental.
- Near: full crown lobes plus branching trunk. Mid: reduced crowns/trunk. Far: two-triangle camera-facing silhouette using a small generated side/top atlas.
- Camera-facing projection is done in clip space because the existing MapLibre custom layer embeds view transforms into Three's projection matrix; ordinary camera.matrixWorld billboarding does not apply here.
- Use twelve reusable InstancedMesh pools (four archetypes × three LODs), shared solid/billboard materials and one 256×128 RGBA atlas. Do not import an alpha WebGPU engine into the WebGL renderer.
- LOD uses an estimated projected size, distance, hysteresis and global near/mid caps. Balanced: at most 72 near, 420 mid, 1,800 total. High: at most 180 near, 800 mid, 3,600 total. Budget pressure demotes detail rather than allocating more meshes.
- Coherent seeded density varies across park/garden/woodland/orchard polygons. Clearings, polygon holes, buildings and roads are excluded. Roadside rows require tree_lined metadata; no trees are inferred beside every road or throughout residential land.
- Near/mid wind is a small shader displacement, disabled for reduced motion, battery saver and static home previews. Far silhouettes remain still; tiny moving pixels would add shimmer. Shadows are cached rest-pose approximations, not refreshed for every leaf movement.
- Frame updates change shared uniforms. Instance transforms change only on bounded location/zoom/quality changes. Geometry is reused; atlas resources are disposed with the scene.

## Consequences
Far geometry drops from 504 triangles per tree in 0.2.1-noir to two. More archetype batches increase draw calls, so the comparison must include both geometry and calls. Tree counts/density differ from V1; a frame-rate number alone does not measure visual quality or phone battery.

Billboards are approximate silhouettes, not volumetric trees at every distance. Species selection, sizes and positions are illustrative. They do not assert botanical or survey accuracy. Current tree keys are stable for a fixed neighborhood frame; seamless placement across independently anchored streamed neighborhoods is a later world-streaming task. Candidate iteration is capped for unusually large vegetation polygons.

The later Day/Night WorldTheme should update shared material/environment response without rebuilding placement or restarting recording. External authored assets remain an option behind the same archetype/LOD boundary.

## 2026-09-20 canopy coverage correction

Mature woodland now uses larger, overlapping crowns; gardens mix shade and broadleaf trees rather than predominantly small ornamentals. Fixed metre spacing replaces polygon-size-dependent thinning. Roads, buildings, water and mapped open areas retain their exclusions.

The total pooled population is now capped at 12,000 in Balanced and 20,000 in High; the original near/mid caps above remain unchanged. Budgeted distant cards are distributed across the stand and represent groups of crowns, preserving canopy coverage without a nearest-tree circular cutoff. Close trees and orchard/roadside rows retain individual dimensions. The bundled mountain demo supplies the exact rendered terrain height for vegetation placement.

Validation: synthetic woodland coverage, exclusion, spatial budget, zoom stability and elevation tests; pooled buffers remain bounded across camera travel (about 6.74 MB in the test scene). Desktop preview measurements are not Pixel 7 qualification.
