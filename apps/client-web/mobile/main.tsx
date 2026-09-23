import {createRoot} from 'react-dom/client';
import {AtlasExperience} from '../components/atlas-experience';
import {KeepleftHome} from '../components/keepleft-home';
import {KeepleftStats} from '../components/keepleft-stats';
import {useEffect,useState} from 'react';
import {NativeRun} from '../lib/native/bridge';
import type {SavedActivity} from '../lib/tracking/storage';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../app/globals.css';

function MobileApp() {
  const [screen,setScreen]=useState<'loading'|'home'|'stats'|'run'>('loading');
  const [activity,setActivity]=useState<SavedActivity>();
  const navigate=(next:'home'|'stats'|'run',record?:SavedActivity)=>{
    window.history.pushState(null,'',next==='home'?'/':`/${next}`);
    setActivity(record);setScreen(next);
  };
  useEffect(()=>{
    const onPopState=()=>{setActivity(undefined);setScreen(location.pathname==='/stats'?'stats':location.pathname==='/run'?'run':'home');};
    window.addEventListener('popstate',onPopState);
    // Reopen an active native session before presenting the journal.
    void NativeRun.state({after:0}).then(state=>{
      const status=state.activity?.snapshot.status;
      setScreen(status==='recording'||status==='paused'?'run':location.pathname==='/stats'?'stats':location.pathname==='/run'?'run':'home');
    }).catch(()=>setScreen(location.pathname==='/stats'?'stats':location.pathname==='/run'?'run':'home'));
    return()=>window.removeEventListener('popstate',onPopState);
  },[]);
  if(screen==='loading')return <div className="atlas-loading" role="status">Opening Keepleft…</div>;
  if(screen==='home')return <KeepleftHome onOpen={record=>navigate('run',record)} onStats={()=>navigate('stats')}/>;
  if(screen==='stats')return <KeepleftStats onHome={()=>navigate('home')} onExplore={()=>navigate('run')}/>;
  return <AtlasExperience initialActivity={activity} onHome={()=>navigate('home')}/>;
}
createRoot(document.getElementById('root')!).render(<MobileApp/>);
