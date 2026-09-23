'use client';
import {Button} from '@/components/ui/button';
import {Slider} from '@/components/ui/slider';
import {ReplayRuntime,replaySpeeds} from '@/lib/tracking/replay';
import type {ActivitySnapshot} from '@/lib/tracking/activity';
import {Play,Pause,RotateCcw, X} from 'lucide-react';
import {useRef,useState} from 'react';
const time=(ms:number)=>`${Math.floor(ms/60000)}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}`;

export function ReplayControls({replay,snapshot,onClose,compact=false}:{replay:ReplayRuntime;snapshot:ActivitySnapshot;onClose:()=>void;compact?:boolean}) {
  const [scrub,setScrub]=useState<number|null>(null);
  const resume=useRef(false);
  return <section className="atlas-replay-controls" aria-label="Replay controls">
    {!compact&&<div className="atlas-replay-heading"><span>{replay.isDemoReplay?'Demo replay':'Saved run replay'}</span><span>{time(scrub??snapshot.elapsedMs)} / {time(replay.durationMs)}</span></div>}
    <Slider aria-label="Replay position" value={[scrub??snapshot.elapsedMs]} min={0} max={Math.max(1,replay.durationMs)} step={100} disabled={replay.durationMs===0}
      onValueChange={value=>{
        if(scrub===null){resume.current=replay.getSnapshot().status==='recording';replay.pause();}
        // Scrubbing previews the time locally. Seek once on release, rather
        // than rebuilding neighborhoods and route history at pointer frequency.
        setScrub(Array.isArray(value)?value[0]:value as number);
      }}
      onValueCommitted={value=>{replay.seek(Array.isArray(value)?value[0]:value as number);setScrub(null);if(resume.current)replay.play();resume.current=false;}}/>
    <div className="atlas-replay-buttons">
      <Button className="atlas-primary-control" disabled={replay.durationMs===0} onClick={()=>snapshot.status==='recording'?replay.pause():replay.play()}>{snapshot.status==='recording'?<Pause/>:<Play/>}{snapshot.status==='recording'?'Pause':snapshot.status==='complete'?'Replay again':'Play'}</Button>
      <div className="kl-replay-speed" role="group" aria-label="Replay speed">
        {replaySpeeds.map(speed=><button type="button" key={speed} aria-pressed={replay.rate===speed} aria-label={`${speed} times speed`} onClick={()=>replay.setSpeed(speed)}>{speed}×</button>)}
      </div>
      {!compact&&<Button variant="outline" aria-label="Restart replay" onClick={()=>{replay.pause();replay.seek(0);}}><RotateCcw/></Button>}
      <Button variant="outline" aria-label="Exit replay" onClick={onClose}><X/><span>Exit</span></Button>
    </div>
    {replay.inGap&&<small>Pause or GPS gap · position held until the next recorded fix</small>}
    {replay.legacyTiming&&<small>Older recording · playback timing is approximate.</small>}
  </section>;
}
