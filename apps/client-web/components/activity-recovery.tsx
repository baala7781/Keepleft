'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {IndexedDBActivityStore} from '@/lib/tracking/storage';
import type {ActivityRuntime} from '@/lib/tracking/activity';
import type {ActivityDraft} from '@/lib/tracking/recovery';
import {CheckpointWriter} from '@/lib/tracking/checkpoint-writer';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';

export function ActivityRecovery({runtime,canRecover,onRecovered,onConflict}:{runtime:ActivityRuntime;canRecover:boolean;onRecovered:()=>void;onConflict:()=>void}) {
  const store=useRef(new IndexedDBActivityStore());
  const [drafts,setDrafts]=useState<ActivityDraft[]>([]);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [discarding,setDiscarding]=useState<ActivityDraft|null>(null);
  useEffect(()=>{
    let mounted=true;
    void store.current.drafts().then(d=>{if(mounted)setDrafts(d);}).catch(()=>{if(mounted)setMessage('Recovery storage is unavailable. Keep this page open and export before leaving.');});
    const writer=new CheckpointWriter(runtime,store.current,(text,conflict)=>{if(mounted){setMessage(text);if(conflict)onConflict();}});
    let previous='ready';
    const unsubscribe=runtime.subscribe(snapshot=>{
      if(snapshot.status!==previous){previous=snapshot.status;void writer.flush();}
    });
    const timer=window.setInterval(()=>{if(runtime.getSnapshot().status==='recording')void writer.flush();},5000);
    const hide=()=>{if(document.visibilityState==='hidden')void writer.flush();};
    const leave=()=>{void writer.flush();};
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
    return ()=>{mounted=false;unsubscribe();clearInterval(timer);document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);};
  },[runtime,onConflict]);
  const recover=async(draft:ActivityDraft)=>{
    if(!canRecover||busy)return;setBusy(true);
    try{
      const claimed=await store.current.claim(draft,runtime.sessionId);
      runtime.restore(claimed);setDrafts(items=>items.filter(d=>d.activity.id!==draft.activity.id));onRecovered();
      setMessage('Recovered to the last saved checkpoint. Resume requests GPS; time while the app was closed is not counted.');
    }catch{setMessage('This run changed or could not be recovered. Close other Keepleft tabs and reload to try again.');}
    finally{setBusy(false);}
  };
  const finish=async(draft:ActivityDraft)=>{
    if(!canRecover||busy)return;setBusy(true);
    try{
      const claimed=await store.current.claim(draft,runtime.sessionId);
      const activity=claimed.activity;
      await store.current.save({...activity,endedAtMs:claimed.savedAtMs,snapshot:{...activity.snapshot,status:'complete',speedMps:0}},runtime.sessionId);
      setDrafts(items=>items.filter(item=>item.activity.id!==draft.activity.id));
      window.dispatchEvent(new Event('keepleft:activities-changed'));
      setMessage('Unfinished activity ended and saved on this device.');
    }catch{setMessage('Could not finish this activity. Close other Keepleft tabs and try again.');}
    finally{setBusy(false);}
  };
  const discard=async()=>{
    const draft=discarding;if(!draft||!canRecover||busy)return;setBusy(true);
    try{
      const claimed=await store.current.claim(draft,runtime.sessionId);
      await store.current.discardDraft(claimed.activity.id,runtime.sessionId);
      setDrafts(items=>items.filter(item=>item.activity.id!==draft.activity.id));
      setDiscarding(null);setMessage('Unfinished recovery record discarded.');
    }catch{setMessage('Could not discard this activity. Close other Keepleft tabs and try again.');}
    finally{setBusy(false);}
  };
  return <div className="atlas-recovery">
    {!!drafts.length&&<details open><summary>Unfinished runs · {drafts.length}</summary>
      <small>Close other Keepleft tabs first. Resume or save the partial activity.</small>
      {drafts.map(d=><div key={d.activity.id}>
        <p>{new Date(d.savedAtMs).toLocaleString()} · {(d.activity.snapshot.distanceM/1000).toFixed(2)} km · {Math.floor(d.activity.snapshot.elapsedMs/60000)} min</p>
        <div className="kl-recovery-actions"><Button variant="outline" disabled={!canRecover||busy} onClick={()=>void recover(d)}>Resume</Button>
          <Button variant="outline" disabled={!canRecover||busy} onClick={()=>void finish(d)}>End & save</Button>
          <Button variant="ghost" disabled={!canRecover||busy} onClick={()=>setDiscarding(d)}>Discard</Button></div>
      </div>)}
    </details>}
    {message&&<p role="status">{message}</p>}
    <AlertDialog open={!!discarding} onOpenChange={open=>{if(!open&&!busy)setDiscarding(null);}}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Discard unfinished activity?</AlertDialogTitle><AlertDialogDescription>Its unsaved route and recovery record will be removed from this device. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep activity</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={()=>void discard()}>Discard activity</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>;
}
