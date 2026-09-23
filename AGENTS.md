# Project Atlas working rules

Read `docs/IMPLEMENTATION_PLAN.md` and the ADRs before changing architecture.

- Build one vertical milestone at a time; each milestone must compile, run, and include deterministic tests.
- MapLibre owns geographic projection, viewport, and tile lifecycle. Three.js owns the hero world and animation.
- React displays domain state but never drives per-frame animation or mutates Three.js objects.
- Keep raw coordinates out of logs, analytics, screenshots, and error reports.
- Recording must remain independent from renderer frame rate and network availability.
- Recorded truth, measurement truth, and visual truth are separate: retain raw GPS locally, derive metrics only from accepted fixes, and use smoothed/map-matched coordinates only for display. Never change recorded metrics to beautify a path.
- Prefer pooled, instanced, or reused geometry and materials. Measure performance before increasing detail.
- New platform services must implement an adapter contract and have a synthetic test double.
- Before changing replay, tracking, world streaming, renderer lifecycle, or quality budgets, read `.cursor/rules/replay-reliability.mdc`. It records the phone-validated 0.2.16 fix and the failed diagnoses that must not be repeated.

## Model choice, efficiency, and user collaboration

These preferences apply throughout this project, including future sessions.

- Assess complexity before each substantial task. For difficult rendering, geometry, camera behavior, architecture, or reasoning-heavy debugging where Astra would materially help, explain why and explicitly ask the user to select Astra before starting that part. Do not silently switch models or delegate it to Astra. If Astra is already confirmed for the current work, do not ask again unnecessarily.
- Use the current model for routine work; do not recommend Astra for every small task.
- Optimize tokens, tool calls, and context without compromising correctness, visual quality, security, or necessary verification. Search narrowly, read relevant sections, reuse findings, keep changes focused, and avoid repeated checks unless new evidence warrants them.
- Keep plans, updates, and explanations concise. Avoid unnecessary artifacts, broad refactors, dependencies, or speculative features.
- When a specific detail, asset, screenshot, trace, or short manual check from the user would materially reduce guesswork or lengthy investigation, ask for exactly what is needed and explain its purpose. Continue independent work while waiting; do not invent the missing information or offload routine agent work.
