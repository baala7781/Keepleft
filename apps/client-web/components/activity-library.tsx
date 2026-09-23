'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {routeGeoJSON,type ActivitySummary,type SavedActivity} from '@/lib/tracking/storage';
import type {ActivityRuntime,ActivityStatus} from '@/lib/tracking/activity';
import {activityStats} from '@/lib/tracking/activity-stats';
import {createActivityStore} from '@/lib/native/platform';
import {isAndroid,NativeRun} from '@/lib/native/bridge';

export function downloadRoute(data:unknown,name='keepleft-activity.geojson') {
  if(isAndroid()){void NativeRun.exportRoute({data:JSON.stringify(data),name}).catch(()=>window.alert('Could not export this route. It remains saved in Keepleft.'));return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/geo+json'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function ActivityLibrary({runtime,status,onSaved,onReplay,canReplay}:{runtime:ActivityRuntime;status:ActivityStatus;onSaved:()=>void;onReplay:(activity:SavedActivity)=>void;canReplay:boolean}) {
  const store=useRef(createActivityStore());
  const [activities,setActivities]=useState<ActivitySummary[]>([]);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const [deleting,setDeleting]=useState<string|null>(null);
  const [confirmDeleteAll,setConfirmDeleteAll]=useState(false);
  const [selected,setSelected]=useState<SavedActivity|null>(null);
  const attempted=useRef('');
  const refresh=useCallback(async()=>setActivities(await store.current.list()),[]);
  useEffect(()=>{void refresh().catch(()=>setMessage('Local storage is unavailable. Export recordings before leaving.'));},[refresh]);
  useEffect(()=>{const changed=()=>{void refresh().catch(()=>setMessage('Could not refresh saved activities.'));};window.addEventListener('keepleft:activities-changed',changed);return()=>window.removeEventListener('keepleft:activities-changed',changed);},[refresh]);
  const save=useCallback(async()=>{
    const activity=runtime.completedActivity();if(!activity)return;
    attempted.current=activity.id;setBusy(true);setSaveError(false);setMessage('Saving activity on this device…');
    try{
      await store.current.save(activity,runtime.sessionId);
      if(runtime.completedActivity()?.id===activity.id){onSaved();setMessage('Activity saved on this device.');}
      await refresh();
    }catch{if(runtime.completedActivity()?.id===activity.id){setSaveError(true);setMessage('Could not save locally. Export your route before leaving, or retry.');}}
    finally{setBusy(false);}
  },[runtime,onSaved,refresh]);
  useEffect(()=>{
    const activity=runtime.completedActivity();
    if(status==='complete'&&activity&&attempted.current!==activity.id)void save();
    if(status==='recording'&&runtime.source==='gps'){setMessage('The completed run saves when you stop.');setSaveError(false);}
    if(runtime.source==='demo'){setMessage('');setSaveError(false);}
  },[status,runtime,save]);
  const exportSaved=async(id:string)=>{
    try{
      const activity=await store.current.get(id);
      if(!activity){setMessage('That activity is no longer stored on this device.');await refresh();return;}
      downloadRoute(routeGeoJSON(activity.samples,activity.snapshot),`keepleft-${new Date(activity.startedAtMs).toISOString().slice(0,10)}.geojson`);
    }catch{setMessage('Could not read the saved activity. Try again.');}
  };
  const exportAll=async()=>{
    if(busy||!activities.length)return;setBusy(true);
    try{
      const all=await Promise.all(activities.map(a=>store.current.get(a.id)));
      const valid=all.filter((a):a is SavedActivity=>!!a);
      const featureCollections=valid.map(a=>routeGeoJSON(a.samples,a.snapshot));
      const allFeatures=featureCollections.flatMap(fc=>fc.features);
      const combined={type:'FeatureCollection',properties:{source:'keepleft-all-activities',count:valid.length,exportedAt:new Date().toISOString()},features:allFeatures};
      downloadRoute(combined,`keepleft-all-activities-${new Date().toISOString().slice(0,10)}.geojson`);
      setMessage('All activities exported.');
    }catch{setMessage('Could not export all activities. Try again.');}
    finally{setBusy(false);}
  };
  const replaySaved=async(id:string)=>{
    if(!canReplay||busy)return;
    setBusy(true);
    try{const activity=await store.current.get(id);if(!activity)throw new Error();onReplay(activity);}
    catch{setMessage('Could not open that replay. Check that the activity contains recorded locations.');}
    finally{setBusy(false);}
  };
  const showDetails=async(id:string)=>{
    if(busy)return;setBusy(true);
    try{const activity=await store.current.get(id);if(!activity)throw new Error();setSelected(activity);}
    catch{setMessage('Could not open those activity details. Try again.');}
    finally{setBusy(false);}
  };
  const remove=async()=>{
    if(!deleting)return;setBusy(true);
    try{await store.current.remove(deleting);await refresh();window.dispatchEvent(new CustomEvent('keepleft:activities-changed'));setMessage('Activity deleted from this device.');setDeleting(null);}
    catch{setMessage('Could not delete the activity. Try again.');}
    finally{setBusy(false);}
  };
  const removeAll=async()=>{
    if(busy)return;setBusy(true);
    try{
      for(const a of activities){await store.current.remove(a.id);}
      await refresh();
      window.dispatchEvent(new CustomEvent('keepleft:activities-changed'));
      setMessage('All saved data deleted from this device.');
      setConfirmDeleteAll(false);
    }catch{setMessage('Could not delete all activities. Try again.');}
    finally{setBusy(false);}
  };
  return <div className="atlas-library">
    {message&&<p role="status">{message}</p>}
    {saveError&&<Button variant="outline" disabled={busy} onClick={()=>void save()}>Retry save</Button>}
    <details open><summary>Saved activities · {activities.length}</summary>
      <small>{runtime.nativeRecording?'Saved on this phone. Uninstalling Keepleft removes local recordings.':'Only in this browser. Clearing site data removes them. Export a backup.'}</small>
      <ul>{activities.map(activity=><li key={activity.id}>
        <span>{activity.placeName&&`${activity.placeName} · `}{new Date(activity.startedAtMs).toLocaleDateString()} · {(activity.snapshot.distanceM/1000).toFixed(2)} km · {Math.floor(activity.snapshot.elapsedMs/60000)} min</span>
        <div><Button variant="outline" disabled={busy} onClick={()=>void showDetails(activity.id)}>Details</Button><Button variant="outline" disabled={!canReplay||busy||!activity.sampleCount} onClick={()=>void replaySaved(activity.id)}>Replay</Button><Button variant="outline" onClick={()=>void exportSaved(activity.id)}>Export</Button>
        <Button variant="outline" disabled={busy} onClick={()=>setDeleting(activity.id)}>Delete</Button></div>
      </li>)}</ul>
      {!activities.length&&<p>No saved GPS activities yet.</p>}
      {activities.length>0&&<div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
        <Button variant="outline" disabled={busy} onClick={()=>void exportAll()}>Export all data</Button>
        <Button variant="outline" disabled={busy} onClick={()=>setConfirmDeleteAll(true)}>Delete all data</Button>
      </div>}
    </details>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}>
      {selected&&<DialogContent className="atlas-activity-dialog">
        <DialogHeader><DialogTitle>{selected.placeName||'Saved activity'}</DialogTitle>
          <DialogDescription>{new Date(selected.startedAtMs).toLocaleString()} · Stored on this device</DialogDescription></DialogHeader>
        {(()=>{const stats=activityStats(selected);return <div className="atlas-activity-stats">
          <article><span>DISTANCE</span><strong>{stats.distanceKm.toFixed(2)}</strong><small>KM</small></article>
          <article><span>ACTIVE TIME</span><strong>{stats.activeTime}</strong></article>
          {selected.activityType==='cycle'?<article><span>AVG SPEED</span><strong>{stats.averageSpeedKph.toFixed(1)}</strong><small>KM/H</small></article>:<article><span>AVG PACE</span><strong>{stats.averagePace}</strong></article>}
          {import.meta.env.VITE_ENABLE_DEV_TOOLS==='true'&&<><article><span>GPS POINTS</span><strong>{stats.sampleCount.toLocaleString()}</strong></article>
          <article><span>GPS QUALITY</span><strong>{stats.medianAccuracyM===null?'—':`±${Math.round(stats.medianAccuracyM)} m`}</strong><small>{stats.segmentCount} {stats.segmentCount===1?'SEGMENT':'SEGMENTS'}</small></article></>}
        </div>;})()}
        <p className="atlas-storage-note">{runtime.nativeRecording?'Saved on this phone. Export a copy before uninstalling Keepleft.':'Saved in this browser. Export a copy before clearing browser data.'}</p>
        <DialogFooter>
          <Button variant="outline" onClick={()=>void exportSaved(selected.id)}>Export</Button>
          <Button disabled={!canReplay||!selected.samples.length} onClick={()=>{const activity=selected;setSelected(null);onReplay(activity);}}>Replay run</Button>
        </DialogFooter>
      </DialogContent>}
    </Dialog>
    <AlertDialog open={deleting!==null} onOpenChange={open=>{if(!open&&!busy)setDeleting(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this activity?</AlertDialogTitle>
      <AlertDialogDescription>The recording will be removed from this device. This cannot be undone; export it first if you want a backup.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={()=>void remove()}>Delete activity</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={confirmDeleteAll} onOpenChange={open=>{if(!open&&!busy)setConfirmDeleteAll(false);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete all saved data?</AlertDialogTitle>
      <AlertDialogDescription>All saved activities and routes will be permanently removed from this device. This cannot be undone. Export your data first if you want a backup.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={()=>void removeAll()}>Delete all data</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
