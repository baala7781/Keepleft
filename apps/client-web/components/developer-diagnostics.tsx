'use client';
import {useEffect,useState} from 'react';
import type {ActivityRuntime} from '@/lib/tracking/activity';
import type {Diagnostics} from '@/lib/renderer/world';

const reasonLabel:Record<string,string>={low_accuracy:'LOW_ACCURACY',duplicate:'DUPLICATE',stationary:'JITTER',
  stale:'STALE',invalid_or_stale:'TIMESTAMP_ERROR',invalid:'TIMESTAMP_ERROR',jump:'IMPOSSIBLE_SPEED_OR_ACCELERATION',
  before_start:'STALE',accuracy:'LOW_ACCURACY'};

export function DeveloperDiagnostics({runtime,scene,coverage,mapStatus}:{runtime:ActivityRuntime;scene:Diagnostics|null;
  coverage:{building:number;green:number;road:number;water:number}|null;mapStatus:string}){
  const [gps,setGps]=useState(()=>runtime.getGpsDiagnostics());
  useEffect(()=>{
    const refresh=()=>setGps(runtime.getGpsDiagnostics());refresh();
    const timer=window.setInterval(refresh,2000);
    return()=>window.clearInterval(timer);
  },[runtime]);
  const rounded=(value:number|null|undefined,unit='')=>value==null?'—':`${Math.round(value*10)/10}${unit}`;
  return <div className="kl-dev-diagnostics" aria-label="Developer diagnostics">
    <p>Local diagnostics only. Coordinates are deliberately hidden; raw fixes remain in this activity on this device.</p>
    <dl>
      <div><dt>GPS quality</dt><dd>{gps.quality}</dd></div>
      <div><dt>Raw / accepted / rejected</dt><dd>{gps.rawFixes} / {gps.acceptedFixes} / {gps.rejectedFixes}</dd></div>
      <div><dt>Accuracy median / p90</dt><dd>{rounded(gps.medianAccuracyM,' m')} / {rounded(gps.p90AccuracyM,' m')}</dd></div>
      <div><dt>Raw / measured distance</dt><dd>{rounded(gps.rawDistanceM,' m')} / {rounded(gps.acceptedDistanceM,' m')}</dd></div>
      <div><dt>Reported / derived / displayed speed</dt><dd>{rounded(gps.reportedSpeedMps,' m/s')} / {rounded(gps.derivedSpeedMps,' m/s')} / {rounded(gps.smoothedSpeedMps,' m/s')}</dd></div>
      <div><dt>Sample interval</dt><dd>{rounded(gps.sampleIntervalMs,' ms')}</dd></div>
      <div><dt>Last decision</dt><dd>{reasonLabel[gps.lastReason]||gps.lastReason.toUpperCase()}</dd></div>
      <div><dt>Map</dt><dd>{mapStatus||'Waiting for map'}</dd></div>
      {coverage&&<div><dt>Buildings / green / roads / water</dt><dd>{coverage.building} / {coverage.green} / {coverage.road} / {coverage.water}</dd></div>}
      {scene&&<><div><dt>Renderer</dt><dd>{scene.fps} FPS · {scene.calls} calls · {scene.triangles.toLocaleString()} triangles</dd></div>
        {scene.frameCosts&&<div><dt>Frame peak · buildings / roads / trees / 3D</dt><dd>{Object.values(scene.frameCosts).map(value=>rounded(value,' ms')).join(' / ')}</dd></div>}
        {scene.interaction&&<div><dt>Moving · FPS / p95 / worst / over 50 ms</dt><dd>{scene.interaction.fps} / {rounded(scene.interaction.p95,' ms')} / {rounded(scene.interaction.worst,' ms')} / {scene.interaction.slow} of {scene.interaction.frames}</dd></div>}
        <div><dt>Trees / windows / route</dt><dd>{scene.detail.trees} / {scene.detail.windows} / {rounded(scene.routeMs,' ms')}</dd></div>
        {scene.buildings&&<div><dt>Building tiles · near / mid / far</dt><dd>{scene.buildings.near} / {scene.buildings.mid} / {scene.buildings.far} · {scene.buildings.calls} calls · {(scene.buildings.bytes/1048576).toFixed(1)} MB · {rounded(scene.buildings.buildMs,' ms')}</dd></div>}
        {scene.roads&&<div><dt>Road patch</dt><dd>{scene.roads.triangles.toLocaleString()} triangles · {rounded(scene.roads.buildMs,' ms')}{scene.roads.failures>0&&` · ${scene.roads.failures} failures (${scene.roads.lastFailure})`}</dd></div>}</>}
    </dl>
    {Object.keys(gps.reasons).length>0&&<div className="kl-dev-reasons"><h3>Rejected fixes</h3>{Object.entries(gps.reasons).map(([reason,count])=><p key={reason}>{reasonLabel[reason]||reason.toUpperCase()} <b>{count}</b></p>)}</div>}
  </div>;
}
