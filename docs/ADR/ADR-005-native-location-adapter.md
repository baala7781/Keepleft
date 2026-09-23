# ADR-005: Native location adapter

Accepted. All providers implement the location contract. Web and synthetic providers support development; iOS Core Location and Android foreground-service implementations support production. Location processing never depends on render frequency.

2026-09-13 implementation: the Android test app uses a Capacitor bridge to an Android location foreground service. Android's LocationManager GPS/network providers, monotonic active clock, filtering and transactional SQLite writes are owned natively; the WebView polls a read-only state/delta mirror. Actions originate from visible app controls or the recording notification. No background-location permission is requested. Process recovery restores the last checkpoint paused rather than inventing capture during downtime. The bridge has a synthetic test double; physical screen-off/device qualification is still required. This is not yet a production reliability claim.
