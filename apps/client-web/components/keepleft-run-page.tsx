'use client';
import {useEffect,useState} from 'react';
import {AtlasExperience} from './atlas-experience';
import {createActivityStore} from '@/lib/native/platform';
import type {SavedActivity} from '@/lib/tracking/storage';
import {Button} from '@/components/ui/button';

export function KeepleftRunPage() {
  const [activity,setActivity]=useState<SavedActivity>();
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    const id=new URLSearchParams(window.location.search).get('activity');
    if(!id){setLoaded(true);return;}
    void createActivityStore().get(id).then(record=>{
      if(cancelled)return;
      if(!record){setError('This run is no longer saved on this device.');return;}
      setActivity(record);setLoaded(true);
    }).catch(()=>{if(!cancelled)setError('Your saved run could not be opened. Return home and try again.');});
    return()=>{cancelled=true;};
  },[]);
  if(!loaded)return <main className="kl-home"><div className="atlas-loading" role={error?'alert':'status'}>{error||'Opening your run…'}{error&&<Button onClick={()=>window.location.assign('/')}>Back home</Button>}</div></main>;
  return <AtlasExperience initialActivity={activity}/>;
}
