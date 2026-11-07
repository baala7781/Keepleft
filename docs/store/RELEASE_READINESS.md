# YourLeft release readiness

## Prepared in the repository

- User-facing name set to YourLeft in web title, Android label, iOS display name, main app wordmarks, and launcher icons. Android version is 0.2.19 (code 24); iOS is 0.2.21 (build 26). Existing app ID and local storage identities are retained for update compatibility.
- In-app privacy and terms pages exist. Privacy wording now distinguishes local GPS/activity storage from third-party map-area requests and their normal network metadata.
- Play listing draft: `PLAY_STORE_LISTING.md`.
- Store icon and feature graphic are supplied under `assets/` in editable SVG and PNG formats.

## Must be completed by the owner before public release

- Buy/configure `yourleft.run`, enable HTTPS, publish the app's privacy policy at `https://yourleft.run/privacy`, and verify it opens publicly without login or regional blocking. The domain does not need to match the app name by policy, but a stable first-party URL is recommended.
- Provide a monitored support email and developer/contact details.
- Upload real release-build screenshots, not concept art.
- Complete Play Console declarations based on the final binary: Data safety, content rating, target audience, ads, permissions, and app access.
- Configure a protected Android release signing key, build and inspect a signed AAB, and preserve the key securely. The existing debug APK is not a Play Store release.
- Complete physical-device release checks, privacy/network review, and Play Console testing-track requirements for the developer account.
- For iOS distribution, configure Apple signing/provisioning and TestFlight or the intended distribution path separately; an Android APK cannot install on iPhone.

## Listing asset dimensions

- App icon: 512 × 512 RGBA PNG.
- Feature graphic: 1024 × 500 RGB PNG.
- Phone screenshots: capture actual app screens on supported device aspect ratios.

Illustrative graphics are branded listing assets only. Do not upload them as screenshots claiming to show app functionality.
