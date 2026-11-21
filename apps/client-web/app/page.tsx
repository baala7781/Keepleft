'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Minus,Plus,RotateCcw} from 'lucide-react';
import manifest from '@/public/fixtures/hussain-sagar/manifest.json';
import {LandingWorld,type LandingWorldApi,type WorldFrame} from '@/components/landing-world';
import {BUILD_STEPS,REPLAY_VIEWS,buildStep,formatStats,replayView,storyPosition} from '@/lib/landing/story-camera';
import './landing.css';

const BETA='mailto:support@yourleft.run?subject=YourLeft%20Android%20beta';
// Public places inside the bundled OpenStreetMap snapshot; nothing here comes from a visitor.
const PLACES=[
  {name:'Hussain Sagar',lng:78.4750,lat:17.4246},
  {name:'Buddha Statue',lng:78.4751,lat:17.4156},
  {name:'Lumbini Park',lng:78.4733,lat:17.4097},
  {name:'NTR Gardens',lng:78.4674,lat:17.4127},
  {name:'Sanjeevaiah Park',lng:78.4751,lat:17.4315},
] as const;

/** The demo route's real shape, for the phone screen. */
const PHONE_PATH=(()=>{
  const route=manifest.route as [number,number][],k=Math.cos(17.42*Math.PI/180);
  const xs=route.map(p=>p[0]*k),ys=route.map(p=>-p[1]);
  const [x0,x1,y0,y1]=[Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)];
  const scale=70/Math.max(x1-x0,y1-y0);
  return route.map((_,i)=>`${i?'L':'M'}${(15+(xs[i]-x0)*scale+(70-(x1-x0)*scale)/2).toFixed(2)} ${(15+(ys[i]-y0)*scale+(70-(y1-y0)*scale)/2).toFixed(2)}`).join('');
})();

function Mark({size=28}:{size?:number}){
  return <span className="yl-mark" style={{width:size,height:size}} aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none"><path d="M5 22c5-1 5-8 10-8s5 5 9 3 2-6 5-8" stroke="#e33b63" strokeWidth="2.6" strokeLinecap="round"/></svg>
  </span>;
}

/** Written straight to the DOM: the world reports per frame and React should not re-render for it. */
function paintFrame(root:HTMLElement|null,frame:WorldFrame){
  if(!root)return;
  const values=formatStats(frame.elapsedMs,frame.distanceM);
  root.querySelectorAll<HTMLElement>('[data-stat]').forEach(el=>{const value=values[el.dataset.stat as keyof typeof values];if(value!==undefined&&el.textContent!==value)el.textContent=value;});
  const bar=root.querySelector<HTMLElement>('.yl-progress span');if(bar)bar.style.transform=`scaleX(${frame.progress.toFixed(4)})`;
  const route=root.querySelector<SVGPathElement>('.yl-phone-route');if(route)route.style.strokeDashoffset=String(1-frame.progress);
}

export default function LandingPage(){
  const story=useRef(.4),world=useRef<LandingWorldApi|null>(null);
  const sections=useRef<HTMLElement[]>([]);const layout=useRef({tops:[] as number[],heights:[] as number[]});
  const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
  const [step,setStep]=useState(0),[view,setView]=useState(0),[section,setSection]=useState(0);
  const [label,setLabel]=useState<{name:string;x:number;y:number}|null>(null);
  const [menu,setMenu]=useState(false);
  const root=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const measure=()=>{layout.current={tops:sections.current.map(el=>el.getBoundingClientRect().top+window.scrollY),heights:sections.current.map(el=>el.offsetHeight)};update();};
    const update=()=>{
      const {tops,heights}=layout.current,s=storyPosition(window.scrollY+window.innerHeight*.4,tops,heights);
      story.current=s;setStep(buildStep(s));setView(replayView(s));setSection(Math.floor(s));
    };
    sections.current=[...(root.current?.querySelectorAll<HTMLElement>('[data-story]')||[])];
    measure();
    const observer=new ResizeObserver(measure);sections.current.forEach(el=>observer.observe(el));
    window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',measure);
    return()=>{observer.disconnect();window.removeEventListener('scroll',update);window.removeEventListener('resize',measure);};
  },[]);

  const onFrame=(frame:WorldFrame)=>paintFrame(root.current,frame);

  const goTo=(index:number,within=0)=>{
    const {tops,heights}=layout.current;if(tops[index]===undefined)return;
    window.scrollTo({top:Math.max(0,tops[index]+within*heights[index]-window.innerHeight*.4+1),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };

  return (
    <div ref={root} className="yl-landing" data-section={section}>
      <div className="yl-stage" data-status={status}>
        <LandingWorld story={story} apiRef={world} onFrame={onFrame} onHover={setLabel}
          onStatus={value=>setStatus(value)}/>
        <div className="yl-shade" aria-hidden="true"/>
        <div className="yl-veil" aria-hidden={status==='ready'}>
          {status==='failed'?<p>The 3D world could not start on this device. <Link href="/run">Open the web app</Link></p>:<p><span className="yl-dot"/>Building Hussain Sagar from map data…</p>}
        </div>
      </div>
      {label&&<div className="yl-tip" style={{left:label.x,top:label.y}} role="tooltip">{label.name}</div>}

      <header className="yl-nav">
        <Link href="/" className="yl-brand" aria-label="YourLeft home"><Mark/>YourLeft</Link>
        <nav className={menu?'open':''} aria-label="Sections">
          {[['Track',1],['Build',2],['Explore',3],['Replay',4]].map(([name,i])=>
            <button key={name} type="button" onClick={()=>{setMenu(false);goTo(i as number,.15);}} aria-current={section===i?'true':undefined}>{name}</button>)}
          <Link href="/privacy">Privacy</Link>
        </nav>
        <a className="yl-btn yl-btn-sm" href={BETA}>Get the beta</a>
        <button className="yl-menu" type="button" aria-label="Menu" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><span/><span/></button>
      </header>

      <main>
        <section data-story="0" className="yl-sec yl-hero">
          <div className="yl-panel">
            <h1>Your run,<br/>replayed as<br/><em>a living world.</em></h1>
            <p className="yl-lede">YourLeft turns an outdoor run, walk or ride into an interactive 3D miniature of the streets, buildings, trees and water you moved through.</p>
            <div className="yl-actions">
              <a className="yl-btn" href={BETA}>Get Android beta <ArrowRight size={16}/></a>
              <button className="yl-btn yl-btn-ghost" type="button" onClick={()=>goTo(3,.2)}>Explore the world</button>
            </div>
            <p className="yl-facts">No account · Stored on your phone · Private by default</p>
          </div>
          <p className="yl-hint">Drag to turn the city · scroll to follow the run</p>
        </section>

        <section data-story="1" id="track" className="yl-sec yl-tall">
          <div className="yl-sticky">
            <div className="yl-panel">
              <span className="yl-index">01 Track</span>
              <h2>Phone away.<br/>Still recording.</h2>
              <p>Start a run and put the phone in your pocket. YourLeft records GPS in the background, keeps every fix on the device, and works offline.</p>
            </div>
            <div className="yl-phone" aria-hidden="true">
              <div className="yl-phone-screen">
                <span className="yl-rec"><i/>Recording</span>
                <svg viewBox="0 0 100 100"><path d={PHONE_PATH} className="yl-phone-ghost"/><path d={PHONE_PATH} pathLength={1} className="yl-phone-route"/></svg>
                <div className="yl-phone-stats">
                  <span><b data-stat="distance">0.00</b> km</span>
                  <span><b data-stat="time">0:00</b></span>
                  <span><b data-stat="pace">–</b> /km</span>
                </div>
                <div className="yl-phone-buttons"><span/><span className="stop"/></div>
              </div>
            </div>
          </div>
        </section>

        <section data-story="2" id="build" className="yl-sec yl-tall">
          <div className="yl-sticky">
            <div className="yl-panel">
              <span className="yl-index">02 Build</span>
              <h2>Tap finish.<br/>World builds.</h2>
              <p>The route, roads, building footprints and parks come from OpenStreetMap. YourLeft raises each building from its real footprint and plants trees inside the mapped green spaces.</p>
              <ol className="yl-steps">
                {BUILD_STEPS.map((name,i)=><li key={name} data-state={i<step?'done':i===step?'active':'todo'}>{name}</li>)}
              </ol>
            </div>
          </div>
        </section>

        <section data-story="3" id="explore" className="yl-sec yl-tall yl-explore">
          <div className="yl-sticky">
            <div className="yl-panel">
              <span className="yl-index">03 Explore</span>
              <h2>Your city,<br/>reimagined.</h2>
              <p>The same streets you ran, rebuilt as a miniature you can turn, tilt and zoom. Pick a place or drag the city.</p>
              <div className="yl-places">
                {PLACES.map(place=><button key={place.name} type="button" onClick={()=>world.current?.focus(place)}>{place.name}</button>)}
              </div>
              <div className="yl-tools">
                <button type="button" onClick={()=>world.current?.view('aerial')}>Aerial</button>
                <button type="button" onClick={()=>world.current?.view('street')}>Street</button>
                <button type="button" aria-label="Zoom in" onClick={()=>world.current?.zoom(.6)}><Plus size={15}/></button>
                <button type="button" aria-label="Zoom out" onClick={()=>world.current?.zoom(-.6)}><Minus size={15}/></button>
                <button type="button" aria-label="Reset view" onClick={()=>world.current?.reset()}><RotateCcw size={14}/></button>
              </div>
            </div>
          </div>
        </section>

        <section data-story="4" id="replay" className="yl-sec yl-taller">
          <div className="yl-sticky">
            <div className="yl-panel">
              <span className="yl-index">04 Replay</span>
              <h2>Watch your city<br/>come alive.</h2>
              <p>Replay the run inside its world, with your speed, turns and pace in context.</p>
              <div className="yl-run">
                <div className="yl-run-head"><strong>Tank Bund Loop</strong><span>Demo run · Hyderabad</span></div>
                <div className="yl-run-stats">
                  <div><b data-stat="distance">0.00</b><span>km</span></div>
                  <div><b data-stat="time">0:00</b><span>time</span></div>
                  <div><b data-stat="pace">–</b><span>pace /km</span></div>
                </div>
                <span className="yl-progress"><span/></span>
                <div className="yl-views">
                  {REPLAY_VIEWS.map(([name,at],i)=><button key={name} type="button" aria-pressed={view===i} onClick={()=>goTo(4,at-4+.02)}>{name}</button>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section data-story="5" id="download" className="yl-sec yl-close">
          <div className="yl-close-inner">
            <h2>Same roads.<br/><em>A clearer you.</em></h2>
            <div className="yl-actions">
              <a className="yl-btn" href={BETA}>Get Android beta <ArrowRight size={16}/></a>
              <Link className="yl-btn yl-btn-ghost" href="/run">Try the web app</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="yl-footer">
        <Link href="/" className="yl-brand"><Mark size={22}/>YourLeft</Link>
        <p>World: Hussain Sagar, Hyderabad, built from OpenStreetMap data. Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, ODbL 1.0. The route is a demo, not a person&apos;s activity.</p>
        <nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/about">About</Link><a href="mailto:support@yourleft.run">support@yourleft.run</a></nav>
      </footer>
    </div>
  );
}
