# Geographic world and motion milestone

Implemented:

- 4,778 sourced geographic features including 3,688 building footprints and Hussain Sagar.
- Fifteen real local vector tiles across zooms 12–14 for MapLibre road/water layers; matching complete footprint geometry for the Three.js hero buildings.
- WGS84 → ECEF → local ENU projection and inverse in packages/geo.
- Floating render origin with a 600 m threshold. CPU geometry stays in a fixed ENU basis; the scene translation and geographic anchor compensation update in one render call. This bounds camera-relative coordinates without rewriting recorded WGS84 points or rebuilding building geometry.
- White architectural building masses, blue water, soft directional shadows, aerial orbit (2.2°/s), smoothly followed runner and free exploration. User gestures release camera control. Reduced-motion preference disables continuous camera movement.
- Demo route uses distance-based interpolation on actual Tank Bund Road geometry. Activity metrics describe a simulated 3.2 m/s run at 12× playback. A separate timer advances the activity independently of rendering.
- One merged building mesh and a fixed-capacity trail ribbon. Runtime diagnostics show measured FPS, hero draw calls, triangles, geometries, origin changes and startup world build time.

Validation: the geographic tests cover decoding all fifteen PBF tiles, finite building geometry, geographic round trips, axis conventions, origin-shift invariance, pause/resume timing and route endpoints. The September 6 follow-up fixes the MapLibre 6 worker entry through Vite's `?worker&url` pipeline. The emitted production worker exists as a standalone bundle. Browser screenshots now confirm navy water, white roads, shoreline and buildings together. Aerial overview zoom adapts to narrow viewports. Demo start/pause/resume/stop/reset were exercised in the existing browser preview; observed hero HUD was around 120 FPS on this desktop (not a device performance guarantee).

Limits: this is flat terrain with an approximate tangent-plane-to-Mercator bridge over the bounded local area; DEM, per-device performance targets, streaming beyond the fixture and depth-of-field matching are not delivered here. GPU performance must be measured on target devices. Hero geometry is built once at startup on the main thread; move this work into a worker before increasing the fixture size or building while recording. Full 3D data is loaded from local GeoJSON while MapLibre orchestrates the tiled road/water layer; production hero tile streaming remains future work.
