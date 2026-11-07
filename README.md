# Keepleft — start here

Keepleft is a local-first walk/run/cycle recorder with a stylized 3D world, saved-activity replay and social route exports. The project was originally called Atlas; some internal names intentionally remain unchanged to preserve data.

**Owner handover, updated 29 September 2026:** [Complete handbook](docs/handbook/README.md).

Most useful guides:

- [Build, connect and install on iPhone](docs/handbook/03-IOS.md)
- [Build and share Android APKs](docs/handbook/02-ANDROID.md)
- [Run the website and understand the source](docs/handbook/01-DEVELOPMENT-AND-ARCHITECTURE.md)
- [Flicker/pause incident: what actually fixed it](docs/handbook/05-REPLAY-AND-RENDERING-INCIDENTS.md)
- [GPS, road alignment, storage and backups](docs/handbook/04-LOCATION-MAPS-AND-DATA.md)
- [Design, exports and known limitations](docs/handbook/06-DESIGN-AND-SHARING.md)
- [Test plan and release blockers](docs/handbook/07-TESTING-AND-RELEASE.md)
- [Troubleshooting and future-developer handover](docs/handbook/08-TROUBLESHOOTING-AND-HANDOFF.md)

## Quick local start

Run from the repository root:

```sh
cd apps/client-web
npm ci
npm run dev -- --port 3001
```

Open `http://localhost:3001`. Requires Node >=22.13 and npm. Mobile builds are separate bundled applications; starting this server does **not** update an installed phone app.

This is a private beta, not a claim of production readiness. In particular, iOS capture is foreground-only; Android uses a native location foreground service. Read the platform-specific limitations before testing outdoors. Do not uninstall or clear storage without exporting valuable activities.
