import {createRoot} from 'react-dom/client';
import {AtlasExperience} from '../components/atlas-experience';
import {KeepleftHome} from '../components/keepleft-home';
import {KeepleftStats} from '../components/keepleft-stats';
import {useEffect,useState} from 'react';
import {NativeRun} from '../lib/native/bridge';
import type {SavedActivity} from '../lib/tracking/storage';
import {LegalConsentGate} from '../components/legal-consent-gate';
import {MobileLegalPage,type LegalScreen} from '../components/mobile-legal-page';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../app/globals.css';

function MobileApp() {
  const [screen,setScreen]=useState<'loading'|'home'|'stats'|'run'|LegalScreen>('loading');
  const [activity,setActivity]=useState<SavedActivity>();
  const navigate=(next:'home'|'stats'|'run'|LegalScreen,record?:SavedActivity)=>{
    window.history.pushState(null,'',next==='home'?'/':`/${next}`);
    setActivity(record);setScreen(next);
  };
  useEffect(()=>{
    const route=()=>{const value=location.pathname.slice(1);return ['stats','run','terms','privacy','about'].includes(value)?value as Exclude<typeof screen,'loading'|'home'>:'home';};
    const onPopState=()=>{setActivity(undefined);setScreen(route());};
    window.addEventListener('popstate',onPopState);
    // Reopen an active native session before presenting the journal.
    void NativeRun.state({after:0}).then(state=>{
      const status=state.activity?.snapshot.status;
      setScreen(status==='recording'||status==='paused'?'run':route());
    }).catch(()=>setScreen(route()));
    const links=(event:MouseEvent)=>{const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href^="/"]');if(!anchor)return;const page=anchor.pathname.slice(1);if(!['terms','privacy','about'].includes(page))return;event.preventDefault();navigate(page as LegalScreen);};
    document.addEventListener('click',links);
    return()=>{window.removeEventListener('popstate',onPopState);document.removeEventListener('click',links);};
  },[]);
  if(screen==='loading')return <output className="atlas-loading">Opening YourLeft…</output>;
  const content=screen==='home'?<KeepleftHome onOpen={record=>navigate('run',record)} onStats={()=>navigate('stats')}/>:screen==='stats'?<KeepleftStats onHome={()=>navigate('home')} onExplore={()=>navigate('run')}/>:['terms','privacy','about'].includes(screen)?<MobileLegalPage screen={screen as LegalScreen} onBack={()=>history.back()} onOpen={navigate}/>:<AtlasExperience initialActivity={activity} onHome={()=>navigate('home')}/>;
  return <LegalConsentGate onLegal={path=>navigate(path.slice(1) as LegalScreen)}>{content}</LegalConsentGate>;
}
createRoot(document.getElementById('root')!).render(<MobileApp/>);
