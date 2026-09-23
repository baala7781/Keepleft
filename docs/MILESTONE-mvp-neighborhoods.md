# MVP1 — basic map completeness and dynamic location

The user narrowed the scope to a working end-to-end MVP with basic building height variation, location-driven maps, and green parks/gardens. No detailed rendering or UI redesign was introduced.

Delivered:

- Keep explicit OSM building heights and floor counts. Unknown heights use stable estimates based on building type and geographic feature ID; estimates remain labeled. Houses and sheds remain shorter than apartment/office estimates. Footprints retain their mapped sizes.
- Added 124 real park/garden polygons to the local demo (4,902 features total; 3,688 buildings). Polygon holes are preserved. MapLibre paints green areas below roads and water.
- Opt-in browser GPS selects a bounded zoom-15 neighborhood with a 25% border. Requests identify approximate map cells, never activity IDs or a recorded trail. New areas load as the user leaves the current area's inner bounds, with request deduplication and a 20-second request interval.
- `/api/world` validates cells, fetches OSM data via documented public Overpass servers, normalizes buildings/roads/water/green areas, and returns GeoJSON. It tries one secondary server after an upstream failure, limits response bytes and feature counts, and keeps at most two short-lived cached public map areas.
- Each live neighborhood creates its own local ENU frame and MapLibre bounds. Camera/renderer replacement never resets capture time or saved samples. Neighborhoods with no building footprints can still display roads and green areas.
- Loading/error/retry and demo-versus-neighborhood labels. GPS recording remains usable while a map request is unavailable. The UI discloses approximate-area requests to the map service and local route storage.

Validation:

- 45 unit/integration tests pass; TypeScript and production build pass, including the API route and map worker bundle.
- Real request through the running local `/api/world` returned HTTP 200 with 1,180 features: 907 buildings, 255 roads, 16 green areas, 2 water features.
- Synthetic integration test covers GPS acquisition outside the fixture, API normalization, local-frame geometry, map-coverage replacement while recording, pause/resume segmentation, Stop, IndexedDB save and reopen, and route export.
- Browser screenshot confirms green parks and varied heights. The existing browser HUD showed approximately 30 FPS during this run; this is an observation, not a target-device performance qualification. No extra per-building meshes or animated details were added.

Limits and next steps:

- Real device GPS and movement across neighborhood boundaries need an outdoor field test. Public map servers can be slow or unavailable; a bounded server cache is not offline map support.
- Poles beyond ±85° are outside the map loader's coverage. Very dense/large geometry responses can exceed MVP limits and display a retry message.
- Building estimates are not surveyed heights. Flat terrain and simple massing remain. No detailed landmark matching or facade generation.
- Next reliability priority: checkpoint and recover unfinished GPS recordings, then replay and broader end-to-end device testing. Current completed-activity storage still cannot recover a recording lost before Stop.
- The prior dependency-advisory release gate remains open. This slice stays local and does not publish the application.
