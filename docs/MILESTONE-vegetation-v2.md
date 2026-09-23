# Vegetation V2 — first World Engine V2 slice

2026-09-14. Android 0.2.2-world-v2, version code 8. The noir UI remains frozen.

## Implemented
- Four authored metre-scale forms: rounded broadleaf, wide shade, narrow columnar and small ornamental.
- Near branching geometry, simplified mid crowns and a two-triangle camera-facing far representation with a locally generated side/top atlas.
- Twelve pooled InstancedMesh archetype/LOD batches, two shared materials and one 128 KiB raw RGBA atlas. No new dependency, imported model or runtime asset service.
- Coherent seeded variation, different woodland/park/garden/orchard densities, varied scale/orientation and overlap spacing.
- Exclusion of water, mapped grass/meadow/pitches, polygon holes, building canopy clearance and road surfaces.
- Roadside planting only for explicit tree_lined metadata; preserve left/right and skip bridge/tunnel planting. Existing normalized maps without that metadata remain supported.
- Projected-size estimation, LOD hysteresis and bounded global detail tiers. Balanced caps at 72 near/420 mid/1,800 total trees; High at 180 near/800 mid/3,600 total.
- Shader-driven near/mid wind; reduced-motion, battery and static-home behavior. Cached rest-pose shadows avoid a full shadow update per wind frame.
- Explicit atlas disposal and stable geometry/instance allocation. Capture, route measurement and storage identities are untouched.

See ADR-011 for architecture and boundaries. Earlier crossed-card prototype failed browser visual review (visible X-shaped foliage); it was replaced before packaging. The final billboards account for MapLibre's view/projection ownership rather than assuming a normal Three camera matrix.

## Verification
- 175 unit tests across 34 files pass. New checks cover geometry bounds/determinism, distinct silhouettes, atlas content, vegetation semantics/density, exclusions, tree-lined road evidence/sides, bridge/tunnel handling, LOD hysteresis, buffer reuse, caps and atlas disposal.
- TypeScript, production web build, Android mobile bundle and debug APK assembly pass.
- Native unit-test task succeeds with the existing tests up-to-date; it is not a new physical-device GPS test.
- Browser exercised aerial/closer views, quality switching, synthetic Start/Pause/Stop, Replay, Orbit selection across Play, Pause and collapse. No captured WebGL console errors in those checks.
- Battery saver observed 0 trees and 51,950 scene triangles; returning to Balanced restores vegetation.
- APK metadata verified: app.keepleft.mobile, version code 8, 0.2.2-world-v2. Same debug signing certificate as 0.2.1-noir. Install as an update, not an uninstall/reinstall.
- APK: /Users/baala/Documents/ChatGPT/OYL/outputs/keepleft-0.2.2-world-v2.apk (about 7 MB).

## Rendering samples
Local desktop browser, not Pixel 7:

| View | FPS | Three calls | Triangles | Trees / geometry count |
|---|---:|---:|---:|---|
| Default aerial, zoom 15.70 | 120 | 8 | 55,536 | 1,405 trees (0 near/4 mid/1,401 far); 16 geometries |
| Closer balanced view | 120 | 13 | 152,850 | 535 trees; 16 geometries |
| Battery saver aerial | 120 | 3 | 51,950 | 0 trees |

Samples include only Three's render counters, not MapLibre's draw calls. The old noir checkpoint used approximately 504 triangles per far tree; the new far billboard uses 2. Density and viewport differ from earlier screenshots, so these totals are not a controlled end-to-end speedup percentage. Geometry count remained at 16 in the inspected aerial/closer views; unit tests separately verify reuse across updates. Sustained heap, GPU-memory, heat and battery profiling are not complete.

## Still required
- Physical Pixel 7 outdoor/sustained review, including tilt/rotation, transitions and full recording/replay.
- Artistic evaluation of species shapes and density in real neighborhoods. Procedural trees and billboards are illustrative, not botanical or surveyed reconstruction.
- More rigorous projected-size/camera-distance selection if device review reveals abrupt LOD changes. The current system has hysteresis, not cross-faded LOD.
- Day/Night WorldTheme is the next slice; no toggle, emissive facade redesign, street lamps, bloom or environment generation is included here.
- Overture ingestion, custom landmarks, terrain, new charts and World Clip export remain subsequent milestones. No photo-cloned/customized avatar work was added.
