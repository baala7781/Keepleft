import {ArrowLeft} from 'lucide-react';

export default function AboutPage() {
  return <main className="kl-stats-page" style={{paddingBottom:'calc(64px + env(safe-area-inset-bottom))'}}>
    <header className="kl-stats-header"><a className="kl-stats-back" href="/" aria-label="Back to home"><ArrowLeft/></a><div><span className="kl-settings-eyebrow">KeepLeft</span><h1>About &amp; Licenses</h1></div></header>

    <section style={{maxWidth:720,lineHeight:1.7,fontSize:'.9rem',color:'#ccc'}}>
      <h2 style={{font:'600 1.15rem var(--font-body)',margin:'32px 0 12px'}}>Your data</h2>
      <p>Keepleft records GPS coordinates on your device only. Your route, metrics and photos are stored in your browser's local database (IndexedDB). No coordinates are sent to a server. Map tiles are loaded from public OpenStreetMap endpoints; these requests include your approximate viewport, not your exact position or activity history.</p>
      <p>When you export or share a story, the output file stays on your device until you choose where to send it. Keepleft does not gain rights to your photos.</p>

      <h2 style={{font:'600 1.15rem var(--font-body)',margin:'32px 0 12px'}}>Map data</h2>
      <p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{color:'var(--accent-secondary)'}}>OpenStreetMap contributors</a>, ODbL 1.0. Building footprints, road centerlines, water, park and terrain features are derived from OpenStreetMap. Live neighborhood data is queried from public <a href="https://wiki.openstreetmap.org/wiki/Overpass_API" target="_blank" rel="noopener noreferrer" style={{color:'var(--accent-secondary)'}}>Overpass API</a> endpoints.</p>
      <p>The bundled demo fixture is a bounded extract containing real building and road geometry. Heights use mapped values where available; missing heights are bounded estimates based on building type. Procedural windows, trees and roof detail are decorative approximations.</p>

      <h2 style={{font:'600 1.15rem var(--font-body)',margin:'32px 0 12px'}}>Animated athlete</h2>
      <p>The bundled character model uses Quaternius CC0 Universal Base Characters and Universal Animation Library assets. Idle, walking, jogging and sprinting are generic authored clips, not a personal avatar. See <code>public/models/NOTICE.md</code> for full attribution.</p>

      <h2 style={{font:'600 1.15rem var(--font-body)',margin:'32px 0 12px'}}>Third-party libraries</h2>
      <ul style={{paddingLeft:20}}>
        <li><strong>polygon-clipping</strong> (MIT) — building part geometry</li>
        <li><strong>gifenc</strong> (MIT) — GIF sticker encoding. License at <code>public/licenses/gifenc.txt</code></li>
        <li><strong>MapLibre GL JS</strong> (BSD-3-Clause) — map rendering</li>
        <li><strong>Three.js</strong> (MIT) — 3D world rendering</li>
      </ul>

      <h2 style={{font:'600 1.15rem var(--font-body)',margin:'32px 0 12px'}}>Delete your data</h2>
      <p>All saved activities, routes and preferences are stored locally. You can delete all data from <strong>Activity settings → Saved activities</strong> in the run screen, or clear your browser's site data for this app.</p>
      <p style={{marginTop:16}}><a href="/privacy" style={{color:'var(--accent-secondary)'}}>Read our full Privacy Policy →</a></p>
    </section>
  </main>;
}
