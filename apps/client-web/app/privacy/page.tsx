import {ArrowLeft} from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <main className="kl-stats-page" style={{paddingBottom:'calc(64px + env(safe-area-inset-bottom))'}}>
      <header className="kl-stats-header">
        <a className="kl-stats-back" href="/" aria-label="Back to home"><ArrowLeft/></a>
        <div><span className="kl-settings-eyebrow">KeepLeft</span><h1>Privacy Policy</h1></div>
      </header>

      <section style={{maxWidth:720,lineHeight:1.7,fontSize:'.9rem',color:'#ccc'}}>
        <p style={{color:'#aaa9ad',fontSize:'.8rem'}}>Last updated: September 2026</p>

        <h2 style={{font:'600 1.15rem var(--font-body)',margin:'28px 0 12px'}}>1. Core Principle: On-Device by Design</h2>
        <p>Keepleft is designed to respect your privacy. All activity tracking, GPS coordinate recording, metric derivation, and route visualization take place directly on your device. Keepleft does not require an account, does not maintain user profiles, and does not upload your location or activities to any server.</p>

        <h2 style={{font:'600 1.15rem var(--font-body)',margin:'28px 0 12px'}}>2. Location Data</h2>
        <p><strong>Foreground and Background Recording:</strong> When you start a walk, run, or cycle activity, Keepleft requests precise location permission. Location coordinates are collected while recording is active, including when the screen is locked or the app is in the background, so that your complete path is accurately captured without pauses or missing segments.</p>
        <p><strong>Storage:</strong> Raw GPS fixes and accepted coordinates are saved only in local on-device storage (IndexedDB in the browser, or local database on mobile devices). They are never transmitted to Keepleft servers or third parties.</p>
        <p><strong>Stopping Location:</strong> Location tracking ceases immediately when you pause, finish, or discard an activity.</p>

        <h2 style={{font:'600 1.15rem var(--font-body)',margin:'28px 0 12px'}}>3. Map and Terrain Data Requests</h2>
        <p>To render the 3D world around your route, Keepleft queries public OpenStreetMap and Overpass API endpoints for building footprints, road geometries, and terrain tiles. These requests include only the approximate geographic bounding box of your current viewport or route corridor. They never contain your personal identity, device identifiers, or past activity history.</p>

        <h2 style={{font:'600 1.15rem var(--font-body)',margin:'28px 0 12px'}}>4. Photos and Social Post Exports</h2>
        <p>When you create a story card or social sticker, any photo you select remains on your device. The animated sticker or static image is rendered in your browser/device memory. Output files are saved to your device only when you choose to export them. Keepleft does not collect, analyze, or claim rights to your photos.</p>

        <h2 style={{font:'600 1.15rem var(--font-body)',margin:'28px 0 12px'}}>5. Data Retention and Deletion</h2>
        <p>Because your data is stored exclusively on your device, you have complete control over its retention:</p>
        <ul style={{paddingLeft:20,margin:'8px 0'}}>
          <li><strong>Individual deletion:</strong> You can delete any saved activity from the activity details sheet or Activity settings at any time.</li>
          <li><strong>Delete all data:</strong> You can purge all stored activities and preferences using the in-app "Delete all data" control in Activity settings.</li>
          <li><strong>System-level deletion:</strong> Uninstalling the mobile app or clearing your browser's site data completely removes all stored activities and cached maps.</li>
        </ul>

        <h2 style={{font:'600 1.15rem var(--font-body)',margin:'28px 0 12px'}}>6. Analytics and Third-Party Trackers</h2>
        <p>Keepleft contains no third-party advertising SDKs, no behavioral trackers, and no third-party analytics services. Diagnostic metrics shown in developer settings remain entirely local to your session.</p>

        <h2 style={{font:'600 1.15rem var(--font-body)',margin:'28px 0 12px'}}>7. Contact</h2>
        <p>If you have questions about Keepleft's privacy practices, you can review the open-source code repository or contact the project maintainers directly.</p>
      </section>
    </main>
  );
}
