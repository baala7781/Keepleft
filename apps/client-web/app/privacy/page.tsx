import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, MapPin, Database, EyeOff, Trash2, Lock, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read the YourLeft Privacy Policy. Learn how YourLeft protects your movement data with local on-device storage, zero advertising trackers, and private-by-design 3D route generation.',
  openGraph: {
    title: 'Privacy Policy | YourLeft',
    description:
      'On-device by design. YourLeft has no accounts, no cloud coordinate database, and no advertising trackers.',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#e0e2e3] font-sans antialiased selection:bg-[#e33b63] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#202326] bg-[#0b0c0e]/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#aaa9ac] hover:text-[#f5f5f5] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to YourLeft
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1d1f22] text-[#f3a1b5] border border-[#383b3f]">
              <Shield className="w-3 h-3 text-[#e33b63]" />
              On-Device Privacy
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Document Header */}
        <div className="mb-12 border-b border-[#202326] pb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#e33b63] mb-3">
            Legal &amp; Data Protection
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#f5f5f5] font-display">
            YourLeft Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-[#8d8d92]">
            Effective Date: November 5, 2026 · Version 1.0 (Public Beta)
          </p>
          <p className="mt-4 text-base sm:text-lg text-[#aaa9ac] leading-relaxed">
            YourLeft is built on a clear foundational premise: <strong className="text-[#f5f5f5]">your movement belongs to you</strong>.
            We do not maintain cloud user profiles, harvest your coordinates for advertising, or track you across the web.
            This policy transparently details the information handled by the application, how permissions operate, and your full control over your data.
          </p>
        </div>

        {/* Quick Summary Pill Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-[#111214] border border-[#202326]">
            <div className="flex items-center gap-2 text-[#f3a1b5] font-semibold text-sm mb-1">
              <Database className="w-4 h-4 text-[#e33b63]" /> Zero Accounts
            </div>
            <p className="text-xs text-[#8d8d92] leading-normal">
              No sign-up, email, or passwords. Your runs are stored locally on your device hardware.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#111214] border border-[#202326]">
            <div className="flex items-center gap-2 text-[#f3a1b5] font-semibold text-sm mb-1">
              <EyeOff className="w-4 h-4 text-[#e33b63]" /> Zero Ad Trackers
            </div>
            <p className="text-xs text-[#8d8d92] leading-normal">
              No third-party analytics SDKs, advertising beacons, or data brokers.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#111214] border border-[#202326]">
            <div className="flex items-center gap-2 text-[#f3a1b5] font-semibold text-sm mb-1">
              <Lock className="w-4 h-4 text-[#e33b63]" /> Endpoint Masking
            </div>
            <p className="text-xs text-[#8d8d92] leading-normal">
              Shared routes automatically hide the first and last 200m to protect your home privacy.
            </p>
          </div>
        </div>

        {/* Policy Sections */}
        <article className="space-y-12 text-sm sm:text-base leading-relaxed text-[#c6c8c9]">
          {/* Section 1 */}
          <section id="on-device-principle" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                1
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Core Principle: On-Device by Design
              </h2>
            </div>
            <p>
              YourLeft (<code className="text-xs text-[#f3a1b5] bg-[#1d1f22] px-1.5 py-0.5 rounded">app.keepleft.mobile</code>)
              operates as a local-first application. When you record an outdoor workout, calculate metrics, or generate a 3D animated replay,
              all processing executes locally on your smartphone or browser client.
            </p>
            <p>
              We do not maintain a central user database, identity service, or cloud server that collects personal movement histories.
              Your activity history is never uploaded to any remote YourLeft server.
            </p>
          </section>

          {/* Section 2 */}
          <section id="information-collected" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                2
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Information Collected &amp; Local Storage
              </h2>
            </div>
            <p>
              To provide the core application functionality, the app creates and maintains the following records strictly within your device’s private local sandbox:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#aaa9ac]">
              <li>
                <strong className="text-[#f5f5f5]">GPS Coordinate Fixes:</strong> Latitude, longitude, timestamp, speed, bearing, and altitude samples acquired from your device&apos;s GPS sensor during an active recording session.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Derived Exercise Metrics:</strong> Elapsed duration, total distance, average pace, moving speed, and elevation gain calculated from accepted satellite fixes.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">User Preferences:</strong> Selected measurement units (metric/imperial), preferred camera replay mode (Follow, Orbit, Overview), and interface toggles.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Storage Technology:</strong> On Android, records are saved in the application&apos;s private, encrypted SQLite database. On Web and iOS beta, records are stored in browser IndexedDB.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="location-permissions" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                3
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Location Permissions &amp; Tracking Lifecycle
              </h2>
            </div>
            <p>
              YourLeft requests permission to access your device&apos;s physical location to accurately measure and visualize outdoor workouts:
            </p>
            <div className="space-y-3 bg-[#111214] p-5 rounded-xl border border-[#202326]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#e33b63] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-[#f5f5f5] text-sm">Android Foreground Service</h3>
                  <p className="text-xs text-[#aaa9ac]">
                    On Android, YourLeft utilizes <code className="text-[#f3a1b5]">ACCESS_FINE_LOCATION</code> and{' '}
                    <code className="text-[#f3a1b5]">FOREGROUND_SERVICE_LOCATION</code>. A persistent notification appears in your Android
                    status shade while recording is in progress. This enables continuous, accurate GPS capture while your screen is locked
                    or while other applications are in view, without requesting unrestricted background location access.
                  </p>
                </div>
              </div>
              <div className="border-t border-[#202326] pt-3 flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#f3a1b5] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-[#f5f5f5] text-sm">Web &amp; iOS Foreground Only</h3>
                  <p className="text-xs text-[#aaa9ac]">
                    In web browsers and the current iOS beta build, location coordinates are acquired exclusively while YourLeft is active in the
                    foreground tab.
                  </p>
                </div>
              </div>
            </div>
            <p>
              <strong className="text-[#f5f5f5]">Immediate Cessation:</strong> GPS polling stops the exact millisecond you tap Pause, Finish, or Discard on an activity. YourLeft does not poll your location when you are not actively recording a session.
            </p>
          </section>

          {/* Section 4 */}
          <section id="third-party-services" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                4
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Third-Party Services &amp; Map Providers
              </h2>
            </div>
            <p>
              To render the stylized 3D miniature world with accurate terrain contours, roads, and building outlines, YourLeft queries external geographic data sources:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#aaa9ac]">
              <li>
                <strong className="text-[#f5f5f5]">OpenStreetMap &amp; Overpass API:</strong> Vector map geometry (road centerlines, building footprints, waterways, green areas) is obtained from OpenStreetMap contributors under the Open Database License (ODbL). Queries transmit the approximate geographic bounding box of the area being viewed.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Terrain &amp; Elevation Services:</strong> Elevation raster tiles are requested to construct the 3D ground topography based on standard web map tile coordinates.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Network Metadata:</strong> Requests made to external geodata endpoints transmit standard HTTP metadata, including your IP address and User-Agent header, as required for any internet communication.
              </li>
            </ul>
            <div className="p-4 rounded-xl bg-[#1d1f22]/60 border border-[#383b3f]/70 text-xs text-[#aaa9ac]">
              <strong className="text-[#f3a1b5]">Important Privacy Safeguard:</strong> Your personal identity, account details, and full activity GPS traces are <em>never</em> attached to these geographic area queries. External providers receive only the tile coordinate or bounding box needed to return local map geometry.
            </div>
          </section>

          {/* Section 5 */}
          <section id="photos-and-sharing" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                5
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Photos, Story Studio &amp; Social Exports
              </h2>
            </div>
            <p>
              YourLeft includes a creative Story Studio that allows you to generate transparent route PNG stickers, animated GIFs, or photo videos for sharing to platforms like Instagram, Strava, and WhatsApp:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#aaa9ac]">
              <li>
                <strong className="text-[#f5f5f5]">Local Photo Processing:</strong> If you select a photo from your gallery to place your route upon, the photo is loaded directly into volatile device memory. YourLeft never uploads, stores, or claims intellectual property rights over your personal photographs.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Default 200-Metre Endpoint Masking:</strong> Because running routes often start or end at a home or workplace, YourLeft automatically hides the first 200 metres and last 200 metres of any activity longer than ~500 metres during social exports. For very short activities where masking is mathematically unfeasible, the interface alerts you so you can make an informed decision before sharing.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Explicit User Dispatch:</strong> No export leaves the app automatically. Files are generated on-device and shared exclusively via your explicit tap on the system Share Sheet or Clipboard copy action.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="analytics-trackers" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                6
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Analytics &amp; Third-Party Trackers
              </h2>
            </div>
            <p>
              YourLeft contains <strong className="text-[#f5f5f5]">no advertising SDKs, no behavioral trackers, and no third-party analytics platforms</strong> (such as Google Analytics, Firebase Analytics, Meta Pixel, or AppsFlyer).
            </p>
            <p>
              We do not sell, rent, monetize, or disclose your location or activity metrics to data brokers, advertisers, insurance providers, or research entities.
            </p>
          </section>

          {/* Section 7 */}
          <section id="retention-and-deletion" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                7
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Data Retention, Deletion &amp; User Control
              </h2>
            </div>
            <p>
              Because your activity data resides entirely on your device, you hold 100% control over its lifecycle:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
              <div className="p-4 rounded-xl bg-[#111214] border border-[#202326]">
                <Trash2 className="w-4 h-4 text-[#e33b63] mb-2" />
                <h3 className="font-semibold text-sm text-[#f5f5f5]">Individual Activity Deletion</h3>
                <p className="text-xs text-[#8d8d92] mt-1">
                  You can delete any single recorded run from the activity details sheet or Activity Library at any time.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#111214] border border-[#202326]">
                <Database className="w-4 h-4 text-[#f3a1b5] mb-2" />
                <h3 className="font-semibold text-sm text-[#f5f5f5]">Purge All Data</h3>
                <p className="text-xs text-[#8d8d92] mt-1">
                  Use the in-app &ldquo;Delete all data&rdquo; button in Activity Settings to wipe all saved workouts, unfinished logs, cached map tiles, and preferences.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#111214] border border-[#202326]">
                <Lock className="w-4 h-4 text-[#aaa9ac] mb-2" />
                <h3 className="font-semibold text-sm text-[#f5f5f5]">App Uninstallation</h3>
                <p className="text-xs text-[#8d8d92] mt-1">
                  Uninstalling the Android app or clearing your web browser data instantly and irreversibly destroys all local database records.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section id="security-practices" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                8
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Security Practices
              </h2>
            </div>
            <p>
              We implement industry-standard mobile and web security architectures to safeguard your information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#aaa9ac]">
              <li>
                <strong className="text-[#f5f5f5]">Operating System Sandboxing:</strong> Android private storage ensures other installed applications cannot access your saved GPS records or activity databases without device root compromise.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Encrypted Transport (HTTPS/TLS):</strong> All map data, 3D building outlines, and terrain elevation requests utilize encrypted HTTPS connections.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Immunity to Server Breaches:</strong> Because YourLeft maintains no centralized cloud database of user coordinates, your location history cannot be leaked via remote server compromises or third-party database breaches.
              </li>
            </ul>
          </section>

          {/* Section 9 */}
          <section id="childrens-privacy" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                9
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Children&apos;s Privacy
              </h2>
            </div>
            <p>
              YourLeft is designed for general audiences and fitness enthusiasts. It is not directed toward children under 13 years of age (or under 16 in certain jurisdictions such as the European Union and United Kingdom).
              We do not knowingly collect, solicit, or process personal data from children. If a parent or guardian becomes aware that a child has installed the app, uninstalling the app immediately wipes all local workout records from the device.
            </p>
          </section>

          {/* Section 10 */}
          <section id="user-rights" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                10
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                User Rights &amp; Data Portability (GDPR &amp; CCPA)
              </h2>
            </div>
            <p>
              Under global privacy legislation including the EU General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#aaa9ac]">
              <li>
                <strong className="text-[#f5f5f5]">Right to Portability &amp; Access:</strong> You can export any single activity or your entire workout history as open standard <code className="text-xs text-[#f3a1b5] bg-[#1d1f22] px-1 py-0.5 rounded">.geojson</code> files at any time through the in-app Activity Library.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Right to Erasure:</strong> You can permanently delete your activities, cache, and settings on demand using the in-app controls.
              </li>
              <li>
                <strong className="text-[#f5f5f5]">Notice Regarding Server Requests:</strong> Because YourLeft collects no identifying information or user accounts on our servers, we have no technical means to associate a remote request with any specific user&apos;s physical device.
              </li>
            </ul>
          </section>

          {/* Section 11 */}
          <section id="contact-and-confirmation" className="space-y-4 border-t border-[#202326] pt-8">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#1d1f22] text-[#e33b63] text-xs font-bold border border-[#383b3f]">
                11
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] font-display">
                Contact &amp; Policy Updates
              </h2>
            </div>
            <p>
              We may update this Privacy Policy from time to time to reflect product enhancements, platform requirements, or regulatory changes.
              When updates occur, the updated policy will be posted on this page and reflected within the application.
            </p>
            <div className="p-5 rounded-xl bg-[#111214] border border-[#202326] space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#f5f5f5]">
                <Mail className="w-4 h-4 text-[#e33b63]" />
                Privacy &amp; Data Protection Inquiries
              </div>
              <p className="text-xs text-[#aaa9ac]">
                If you have questions about this Privacy Policy or your data rights, contact us at:
              </p>
              <p className="text-sm font-mono text-[#f3a1b5]">
                support@yourleft.run
              </p>
              <p className="text-xs text-[#8d8d92]">
                You may also contact the developer through the official support email listed on the YourLeft Google Play Store listing.
              </p>
            </div>
          </section>
        </article>

        {/* Footer Navigation */}
        <div className="mt-16 pt-8 border-t border-[#202326] flex flex-wrap items-center justify-between gap-4 text-xs text-[#8d8d92]">
          <p>© 2026 YourLeft. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#f5f5f5] transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-[#f5f5f5] transition-colors">Terms of Use</Link>
            <Link href="/about" className="hover:text-[#f5f5f5] transition-colors">About &amp; Licenses</Link>
            <Link href="/run" className="hover:text-[#f3a1b5] transition-colors">Web Demo</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
