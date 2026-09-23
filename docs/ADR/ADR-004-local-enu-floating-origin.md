# ADR-004: Local ENU and floating origin

Accepted. Domain coordinates remain WGS84 while render coordinates use a local east-north-up tangent plane. The world coordinator will shift origin outside a tested distance threshold to retain GPU precision without changing recorded coordinates.

2026-09-13 correction after close-zoom QA: keep true WGS84/ECEF ENU for domain/geodesy calculations, but use a map-aligned projected-metre frame for the shared MapLibre/Three render plane. Directly treating ellipsoidal ENU metres as spherical Mercator metres introduced visible camera/geometry offsets at high zoom. MapPlaneFrame uses the same MercatorCoordinate conversion for buildings, marker, trail and camera; FloatingOrigin accepts the shared LocalFrame contract and still rebases atomically. This changes presentation only, never saved GPS or recorded distance. The current scene remains flat terrain, with local metre scale defined at the map anchor.
