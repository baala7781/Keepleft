# ADR-001: Hybrid MapLibre and Three.js rendering

Accepted. MapLibre owns projection, viewport and tile orchestration. Three.js runs as a custom layer in the same WebGL context and owns the authored hero world. This preserves geographic correctness without limiting art direction.

