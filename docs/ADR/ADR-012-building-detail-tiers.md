# ADR-012: Bounded building detail on the shared map

Accepted 2026-09-20 for Phase 2 of WORLD_FOUNDATIONS_ROADMAP.md.

Resolve seven presentation archetypes from available building semantics: house, apartment, office, commercial, institutional, industrial, fallback. Retain source footprints, holes, mapped heights and building parts. Only unverified generic height estimates receive restrained compression in the rendering copy; source data and tracking remain unchanged. Missing roof tags remain flat.

Group buildings in 192 m cells. One indexed far mesh contains the loaded neighborhood's simple extrusions. Detailed cells are removed from its index and rendered exactly once in bounded near/mid batches. Balanced permits four near and ten mid cells; high permits six and sixteen. Build at most one detailed cell per frame, retain the far representation until it is ready, and dispose detail buffers on demotion. Distance/zoom hysteresis reduces toggling. Static previews request frames until queued detail settles.

Near geometry includes the existing pitched roofs plus round/dome roofs and restrained coping for estimated flat buildings. Curved roofs use fewer subdivisions at middle distance; the far tier uses simple extrusion. Courtyard holes remain open. Facade dimensions and spacing depend on archetype and use the existing capped instance pool. Night illumination is deterministic, using shared materials and per-instance intensity.

Vegetation retains four archetypes, twelve pooled batches, and existing near/mid/far caps. Distinct crown envelopes and bounded secondary clusters improve silhouettes. Park groves use deterministic density variation; mapped clearings, roads, buildings and water remain excluded. Tree positions and species are illustrative, not surveyed.

Tradeoffs: flat-roof neighborhoods see a modest triangle increase and additional draw calls near the camera. The far vertex buffers stay resident while detailed cells are visible, trading bounded memory for cheap index updates. This is not city-wide streaming. Desktop geometry and rendering evidence does not establish Android thermal/battery performance.
