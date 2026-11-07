# YourLeft owner and engineering handbook

Updated **4 November 2026**. This handbook is intended to let the owner continue without Codex or the original conversation. It describes inspected source and known build history, not every historical proposal as if implemented.

## Reading order

| Need | Document |
|---|---|
| Understand the app, folders, commands and hosting | [01 — Development and architecture](01-DEVELOPMENT-AND-ARCHITECTURE.md) |
| Build an APK and update an Android phone | [02 — Android](02-ANDROID.md) |
| Set up Xcode, sign, connect, build and install | [03 — iOS](03-IOS.md) |
| Understand accuracy, offline maps and backups | [04 — Location, maps and data](04-LOCATION-MAPS-AND-DATA.md) |
| Never repeat the expensive flicker investigation | [05 — Replay and rendering incidents](05-REPLAY-AND-RENDERING-INCIDENTS.md) |
| Change UI or social exports without breaking tracking | [06 — Design and sharing](06-DESIGN-AND-SHARING.md) |
| Know what is actually ready and what must be tested | [07 — Testing and release](07-TESTING-AND-RELEASE.md) |
| Diagnose problems and brief a new developer/AI | [08 — Troubleshooting and handoff](08-TROUBLESHOOTING-AND-HANDOFF.md) |
| Prepare Play listing and inspect what remains | [Store release readiness](../store/RELEASE_READINESS.md) and [listing draft](../store/PLAY_STORE_LISTING.md) |

## Snapshot, not marketing claims

- Web application: React/TypeScript, Vite/Vinext, MapLibre camera/geography, Three.js custom world layer.
- Native shells: Capacitor, application ID `app.keepleft.mobile` on both platforms.
- Android: native GPS recorder/service, SQLite, native video/image sharing bridge.
- iOS: native foreground geolocation added; IndexedDB activity persistence; native HTTP map downloads added. **No Android-equivalent background recording yet.**
- No account system, cloud activity sync, friend tracking, leaderboard or health integration implemented in this beta.
- User-facing third-person entry points intentionally hidden. Do not re-enable simply because the code/assets still exist.
- Current default demo is the bundled **Madmaheshwar** fixture, internally spelled `madhyamaheshwar`. The old request for Kedarnath has not become a verified new fixture.
- Android project currently says version `0.2.19-yourleft-preview`, code `24`. iOS project says `0.2.21`, build `26`. Different numbers are real; `package.json`'s `0.1.0` is not the mobile build version.
- Last known installed iOS build before this handover: `0.2.20` live maps, 28 September. Source/build changes on 29 September do not silently update that installation.

## Work completed in this handover

The road-display matcher now searches a bounded chain of connected OSM road sections, instead of only one road/shared junction. A fallback connector that intersects a mapped building becomes a display break rather than a solid line through it. Raw GPS, stored segment boundaries, distance, pace and replay clocks are untouched. This fixes reproducible synthetic cases; it is **not** a guarantee that GPS, missing OSM roads or every real route is perfect. See [04](04-LOCATION-MAPS-AND-DATA.md).

Validation results and remaining physical checks are recorded in [07](07-TESTING-AND-RELEASE.md). A fix in source is distinct from a built package, an installed package, and a phone-validated result.

## Which documents win if they disagree?

1. Executable source, manifests and a reproduced test determine current behavior.
2. This dated handbook consolidates current findings.
3. `AGENTS.md` and `.cursor/rules/replay-reliability.mdc` define engineering safeguards.
4. ADRs explain design decisions; some describe planned architecture rather than shipped features.
5. Old `MILESTONE-*`, `IMPLEMENTATION_PLAN`, `ANTIGRAVITY_HANDOFF` and checklists are historical context. Their unchecked boxes and version numbers are not a current audit.

Especially: Overture/PMTiles, cloud sync, cinematic reference images and avatar aspirations must not be represented as current capabilities. Public Overpass is the current live geographic source.

## Keep this knowledge safe

Keep the repository, including untracked source files reviewed for inclusion, in a private backup/version-control system. A ZIP/APK/IPA is not a source backup. Keep signing keys separately and securely; never put passwords, private keys or personal GPS recordings in Git. No remote backup or Git commit was made merely by writing this handbook.
