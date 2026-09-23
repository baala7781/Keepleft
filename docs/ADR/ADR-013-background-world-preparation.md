# ADR-013: Background preparation during map interaction

Accepted 2026-09-20. Camera movement and Pause/Exit must not wait for procedural geometry.

Forest placement, detailed building tiles, and physical road intersections run in one bundled local Web Worker per world. MapLibre and Three.js retain their existing projection and drawing ownership. Geometry attributes transfer back without copying their buffers. Tracking and storage do not depend on worker completion.

Vegetation and road requests retain only an in-flight job and the latest queued destination. Obsolete replies are ignored. Building tiles keep their far representation until matching detail is ready. Existing roads and trees remain visible during preparation. Tree transforms stage in approximately 2 ms slices, then commit complete instance buffers together; only populated ranges upload. Density, semantic exclusions, and near/mid limits remain unchanged.

Replacing or disposing a world terminates its worker and invalidates pending callbacks. The synchronous constructors remain available for deterministic geometry tests and non-browser environments. Worker startup errors in the browser must not silently select synchronous preparation.

Diagnostics include moving-frame percentiles and per-phase main-thread costs. Desktop checks reproduced the old forest stall at roughly 18 FPS with a 168 ms detail update. Afterward, the same forest remained at 12,000 trees and about 120 FPS in the preview; a city interaction sample at about 300,000 triangles had 8.7 ms p95 and no frames over 50 ms. These are short desktop samples, not Android thermal or battery qualification.

Tradeoffs: staged tree buffers add bounded CPU memory, and newly viewed detail can arrive shortly after the camera. Initial world setup and the far building mesh still prepare on the main thread; this change addresses repeated camera-triggered detail work. No extra network service or dependency is introduced.
