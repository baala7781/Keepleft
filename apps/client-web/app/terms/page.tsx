import {ArrowLeft} from 'lucide-react';
import Link from 'next/link';
import {LEGAL_VERSION} from '@/lib/legal/consent';

export default function TermsPage(){return <main className="kl-stats-page kl-legal-page">
  <header className="kl-stats-header"><Link className="kl-stats-back" href="/" aria-label="Back to home"><ArrowLeft/></Link><div><span className="kl-settings-eyebrow">YourLeft · Private beta</span><h1>Terms of Use</h1></div></header>
  <article className="kl-legal-copy"><p className="kl-legal-date">Effective 24 September 2026 · Version {LEGAL_VERSION}</p>
    <h2>1. Beta software</h2><p>YourLeft is pre-release software provided for testing. Features may change, fail, or produce incomplete results. Keep an independent copy of any activity you cannot afford to lose.</p>
    <h2>2. Fitness and safety</h2><p>YourLeft is a visualization and activity-recording tool. It is not medical advice, emergency assistance, turn-by-turn navigation, or a substitute for situational awareness. Do not interact with the app while moving through traffic, unsafe terrain, or any environment that requires your full attention.</p>
    <h2>3. Accuracy</h2><p>GPS position, distance, pace, speed, calories, elevation, road alignment, buildings and terrain may be delayed, estimated or inaccurate. You are responsible for checking an activity before relying on or sharing it.</p>
    <h2>4. Your content</h2><p>You retain ownership of your activities, photos and exports. You are responsible for having permission to use and share any photo, name, logo or other material you add. Do not use YourLeft to expose another person&apos;s private location or to create unlawful, harmful or misleading content.</p>
    <h2>5. Location privacy</h2><p>A route can reveal a home, workplace or routine even without a place name. YourLeft offers route-end masking for social exports, but you must review every export before sharing it.</p>
    <h2>6. Third-party data</h2><p>Map, terrain and place information may come from third-party providers including OpenStreetMap and public data services. Their availability, accuracy and licence terms are outside YourLeft&apos;s control.</p>
    <h2>7. Local data and availability</h2><p>Activities are stored on your device in this beta. Uninstalling the app, clearing its storage, device failure or browser cleanup can remove them. Export backups regularly. The service is provided without a guarantee of uninterrupted availability.</p>
    <h2>8. Acceptable use</h2><p>Do not reverse engineer security controls, overload public map services, misuse location data, or use the app in a way that violates applicable law or another person&apos;s rights.</p>
    <h2>9. Disclaimer and limitation</h2><p>To the extent permitted by applicable law, YourLeft is provided &ldquo;as is&rdquo; without warranties. The maintainers are not responsible for injury, navigation decisions, lost activity data, indirect loss, or content you choose to publish. Rights that cannot legally be excluded remain unaffected.</p>
    <h2>10. Changes and contact</h2><p>Material changes create a new Terms version and require acceptance again. During the private beta, use the feedback channel through which you received the app to contact the maintainers.</p>
    <nav className="kl-legal-links"><Link href="/privacy">Privacy Policy</Link><Link href="/about">About &amp; Licenses</Link></nav>
  </article>
</main>;}
