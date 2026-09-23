# ADR-007: WebGLRenderer for integrated MapLibre

Accepted. Three.js WebGLRenderer shares MapLibre's WebGL context for version one. WebGPU is not a hard dependency. The renderer boundary will allow a standalone future backend without changing tracking, replay or world-domain logic.

