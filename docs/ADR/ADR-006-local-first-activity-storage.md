# ADR-006: Local-first activity storage

Accepted. Recorded samples and immutable activity snapshots are written locally first. IndexedDB supports the web shell and SQLite supports native builds behind the same storage interface. Cloud sync is opt-in and deferred.

2026-09-13: Android stores every accepted point and its activity metadata in one SQLite transaction. A five-second native checkpoint also persists active time while GPS is stationary. Completed activities stay in the native library and feed the existing replay/export flow. Android backup and device-transfer exclusions prevent implicit route upload; users can explicitly share a GeoJSON export. Uninstalling the app removes its local data. These guarantees apply to successfully committed writes, not to arbitrary storage/device failure.
