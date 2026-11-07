import {ArrowLeft} from 'lucide-react';
import {Button} from './ui/button';
import {LEGAL_VERSION} from '@/lib/legal/consent';

export type LegalScreen='terms'|'privacy'|'about';

export function MobileLegalPage({screen,onBack,onOpen}:{screen:LegalScreen;onBack:()=>void;onOpen:(screen:LegalScreen)=>void}){
  return <main className="kl-stats-page kl-legal-page"><header className="kl-stats-header"><Button className="kl-stats-back" variant="ghost" aria-label="Back" onClick={onBack}><ArrowLeft/></Button><div><span className="kl-settings-eyebrow">YourLeft · Private beta</span><h1>{screen==='terms'?'Terms of Use':screen==='privacy'?'Privacy Policy':'About & Licenses'}</h1></div></header>
    <article className="kl-legal-copy">{screen==='terms'?<>
      <p className="kl-legal-date">Effective 24 September 2026 · Version {LEGAL_VERSION}</p>
      <h2>Beta software</h2><p>YourLeft is pre-release software for testing. Features may change, fail, or produce incomplete results. Export any activity you cannot afford to lose.</p>
      <h2>Fitness and safety</h2><p>YourLeft is not medical advice, emergency assistance or navigation. Do not interact with it while moving through traffic or unsafe terrain. GPS, distance, pace, speed, elevation, maps and 3D geography may be delayed, estimated or inaccurate.</p>
      <h2>Your content</h2><p>You retain ownership of activities, photos and exports. You are responsible for permission to use anything you add and for reviewing a route before sharing it.</p>
      <h2>Location privacy</h2><p>A route may reveal a home, workplace or routine. Social exports mask the first and last 200 metres by default when the activity is long enough, but you must still review every export.</p>
      <h2>Local data</h2><p>Activities are stored on this device. Uninstalling YourLeft, clearing storage or device failure can remove them. Public map services receive the approximate area needed to draw the world.</p>
      <h2>Acceptable use</h2><p>Do not misuse location data, violate another person&apos;s rights, overload map services or use YourLeft unlawfully.</p>
      <h2>Disclaimer</h2><p>To the extent permitted by law, this beta is provided as is without warranties. The maintainers are not responsible for unsafe navigation decisions, lost activity data, injury, indirect loss or content you publish.</p>
      <h2>Changes and contact</h2><p>Material changes require acceptance of a new version. Use the feedback channel through which you received this beta.</p>
    </>:screen==='privacy'?<>
      <p className="kl-legal-date">Last updated 4 November 2026</p>
      <h2>On-device by design</h2><p>YourLeft has no account system. GPS recordings, activity metrics, photos and saved activities remain on this device unless you deliberately export or share them.</p>
      <h2>Location</h2><p>Precise location is requested to record a walk, run or ride. Android can continue through an ongoing foreground-service notification when the screen is locked. This iOS beta does not yet claim background recording.</p>
      <h2>Maps</h2><p>OpenStreetMap, terrain and other map providers may receive the approximate map area being viewed and ordinary network metadata such as your IP address. YourLeft does not include your account identity or upload saved activity history in map-area requests. Provider handling is governed by their own policies.</p>
      <h2>Photos and exports</h2><p>Selected photos are processed locally. Files leave YourLeft only when you copy, save or share them. A shared route may reveal sensitive places.</p>
      <h2>Control</h2><p>You can export activities, delete an individual activity, or delete all activities, unfinished recordings, map cache and preferences from Activity settings.</p>
      <h2>Tracking</h2><p>This beta contains no advertising SDK, behavioural tracking or third-party analytics. Map providers still receive the map-area requests and network metadata described above.</p>
    </>:<>
      <p className="kl-legal-date">YourLeft 0.2.18 · Private beta</p>
      <h2>Your data</h2><p>Activities are stored locally using IndexedDB on the web and the app&apos;s private SQLite database on Android. No YourLeft account or activity server is used.</p>
      <h2>Map data</h2><p>Map features are derived from OpenStreetMap contributors under ODbL 1.0. Live neighbourhood data may use public Overpass API endpoints. Heights and decorative 3D details may be estimated.</p>
      <h2>Open-source components</h2><p>MapLibre GL JS (BSD-3-Clause), Three.js (MIT), polygon-clipping (MIT) and gifenc (MIT). The character assets use Quaternius CC0 resources.</p>
      <h2>Deleting data</h2><p>Use Activity settings → Saved activities → Delete all data, or remove the app, to delete local information.</p>
    </>}
      <nav className="kl-legal-links">{screen!=='terms'&&<button onClick={()=>onOpen('terms')}>Terms of Use</button>}{screen!=='privacy'&&<button onClick={()=>onOpen('privacy')}>Privacy Policy</button>}{screen!=='about'&&<button onClick={()=>onOpen('about')}>About &amp; Licenses</button>}</nav>
    </article>
  </main>;
}
