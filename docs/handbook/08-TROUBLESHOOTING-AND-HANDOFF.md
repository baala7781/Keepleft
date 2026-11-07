# 08 — Troubleshooting and continuation without Codex

## Quick diagnosis table

| Problem | First checks | Avoid |
|---|---|---|
| Phone still has old UI | Rebuild mobile, sync native, build/install; compare version and artifact hash | Assuming localhost refresh updates phone |
| History vanished on web | Exact hostname/port, browser profile, private browsing | Clearing more data or renaming IndexedDB |
| “Finding GPS” forever | OS location, app precise permission, outdoors, provider error state | Treating internet speed as GPS accuracy |
| Demo works/current map blank | Native vs web map loader, cache presence, Overpass error | Assuming demo is the live area |
| “No offline maps saved here” on iOS | May be old offline-only 0.2.19 build; verify updated loader/install | Granting GPS repeatedly to fix missing map data |
| Pause repeats at exactly same replay time | Segment boundary/timing and active world | Randomly lowering tree count again |
| Buttons and timeline stutter too | Main-thread trace, canvas resize, geometry commits, encoder work | Adding UI transitions to mask stalls |
| Road line crosses building | Original vs matched route, road topology, accuracy/footprints | Changing recorded distance or global snap radius |
| Cycle marker jumps sideways | Ensure cycle/fast-legacy snapping remains disabled | Nearest-road matching for every mode |
| Map services fail | Retry with connectivity, cached area; inspect status without logging coordinates | Continuous aggressive retries to public APIs |
| PNG/GIF blurry | Backing canvas/export resolution, scaling, format; inspect actual file | Only changing CSS size |
| Copy does not paste in another app | Clipboard support + receiving app; share/download fallback | Claiming all apps support animated paste |
| APK update rejected | Signing certificate and application ID | Uninstalling before data export |
| iPhone app fails after a week | Personal Team profile expiry and Developer Mode | Rewriting app code to fix provisioning |
| iOS install without cable surprises owner | Paired network-reachable device | Claiming Keepleft has automatic remote updates |

## How to gather a useful bug report

Record: app/platform build; device/OS; screen/mode; activity type; live vs saved replay; reproduction actions; exact activity timestamp; whether buttons also stop; GPS quality; online/offline state; expected vs actual behavior. Attach a private recording/export only when needed and consented.

Do not repeatedly request the same video when the exact saved replay is already available. Keep private attachments outside source and build directories. Report aggregate sample counts, durations, gap lengths and frame timing instead of printing a route.

## Safe recovery order

1. Export valuable activities first if possible.
2. Confirm the actual build and correct origin/platform.
3. Restart the app/browser without clearing storage.
4. Separate permission, recording, storage, map fetch and rendering failures.
5. Run a small synthetic reproduction and targeted tests.
6. Apply the smallest supported fix; verify original data unchanged.
7. Use cache/data deletion only when specifically justified and approved. Map cache and activity database are different stores.

## Practical daily workflow

```sh
cd /Users/baala/Documents/Codex/2026-09-06/fir/atlas
git status --short
git diff --stat
```

At handover the checkout already contained many modified and untracked files from earlier development. They are not all changes from this task. Do not reset/clean them. Review intended source files before making a private backup/commit; exclude private routes, signing material and build outputs. Do not blindly `git add .` while unfamiliar untracked directories exist.

For a focused change:

1. Read `AGENTS.md`, relevant source/tests, and replay guardrails if applicable.
2. Reproduce and identify the responsible subsystem.
3. Make a focused patch, write a regression, run affected tests.
4. For shared code run TypeScript/full tests/web/mobile builds.
5. Build native package, record version/hash, install and physically validate affected flow.
6. Update this handbook's dated validation/status if behavior changes.

There is no need to rebuild unchanged APKs repeatedly while editing documentation alone. Conversely, documentation saying “fixed” does not install source changes onto a device.

## Suggested next work, in priority order

1. Phone-validate the 29 September road fix on the original walking/running route and ensure historical replay remains smooth.
2. Verify iOS actual-location map download and foreground recording; implement native background recording before promising full running-app parity.
3. Implement proper full-fidelity export/import recovery before widespread beta distribution.
4. Audit real dependency vulnerabilities, privacy/network declarations, licensing and current support information.
5. Complete the release matrix, especially long activity battery/thermal behavior and iOS exports.
6. Consolidate duplicated legal/version text and CSS tokens without touching replay internals.
7. Only then revisit richer avatars, friends/events, health integration or cinematic improvements.

No need to add buses, cars or street furniture for the current fundamentals. No third-person view until a separately approved, measured redesign.

## Brief to give a future developer or AI

> Keepleft is an existing local-first React/TypeScript + Capacitor application, not a new project. Read README.md, docs/handbook/README.md, AGENTS.md and .cursor/rules/replay-reliability.mdc first. Inspect the dirty working tree and preserve unrelated changes. Distinguish recorded GPS/metrics from visual road/replay presentation. The successful 0.2.16 fix was a short reconnect-segment visual bridge plus current-world-only activation; do not replace it with generic smoothing. Cycling/fast legacy replay must not snap to roads. Android has native background-capable service/SQLite; iOS currently has native foreground GPS and IndexedDB, not background parity. Native map requests use Capacitor HTTP, while web uses /api/world. Do not upload private routes or claim release readiness from compilation. Use focused tests and real-device acceptance; document exact changes and remaining limitations. Ask the owner before complex architectural expansion or new location-data sharing. Optimize effort without sacrificing correctness.

## Manual tasks only the owner can complete

- Apple/Google account sign-in, two-factor authentication, agreements and enrollment.
- iPhone trust, Developer Mode confirmation and device permissions.
- Secure signing-key custody and decisions about distribution/account ownership.
- Actual outdoor accuracy and screen-lock/battery tests.
- Final identity/support/legal details and public release authorization.

Never ask the owner to send passwords/private signing keys to an AI. Ask for a specific observable result or local action instead.

## Archived knowledge worth retaining

- `docs/ADR/`: architecture decisions, including planned ones.
- `docs/MILESTONE-*`: earlier implementation evidence and scope decisions.
- `docs/GPS_AUDIT.md`, `WEB_LOCATION_LIMITATIONS.md`: diagnostic context.
- `docs/WORLD_ENGINE_V2.md`, `WORLD_FOUNDATIONS_ROADMAP.md`: future world goals, not proof they shipped.
- `docs/DATA_LICENSES.md`, `public/models/NOTICE.md`: map/model provenance.
- `docs/ANTIGRAVITY_HANDOFF.md`, `RELEASE_RELIABILITY_TODO.md`: earlier task allocation/checkpoints; superseded status is in this handbook.

## Backup before losing tool access

Codex access is not required to open the project, run npm/Gradle/Xcode or use these Markdown files. Keep a private copy of the complete intended source and lockfiles, the handbook, screenshots of signing settings without secrets, and secure backups of signing keys. Keep important activities separately. A repository backup must include relevant untracked source after review; a Git archive of only committed HEAD would omit it.

No hosting account, remote repository, production signing or automatic cloud backup has been created by this documentation task. Do not assume any of those exist without checking.
