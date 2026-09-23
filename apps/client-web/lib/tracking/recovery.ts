import type {SavedActivity} from './storage';

export type ActivityDraft={version:1;owner:string;revision:number;savedAtMs:number;activity:SavedActivity};
export class RecoveryConflict extends Error {
  constructor(){super('This run changed in another tab. Reopen Keepleft before continuing.');}
}

/** Validate local persisted data before using it as recording state. No coordinates in errors. */
export function validateDraft(draft:ActivityDraft) {
  const a=draft?.activity,s=a?.snapshot;
  if(draft?.version!==1||!draft.owner||!Number.isSafeInteger(draft.revision)||draft.revision<1||!Number.isFinite(draft.savedAtMs)||
    a?.version!==1||!a.id||a.source!=='gps'||!s||!['recording','paused','complete'].includes(s.status)||
    ![a.startedAtMs,a.endedAtMs,s.elapsedMs,s.distanceM].every(Number.isFinite)||s.elapsedMs<0||s.distanceM<0||
    !Array.isArray(a.samples)||a.samples.length>100000||
    (a.rawSamples!==undefined&&(!Array.isArray(a.rawSamples)||a.rawSamples.length>100000))||
    (a.sampleDecisions!==undefined&&(!Array.isArray(a.sampleDecisions)||a.sampleDecisions.length>100000)))throw new Error('This recovery record cannot be opened.');
  let timestamp=-Infinity,elapsed=-Infinity;
  for(const p of a.samples){
    if(![p.lng,p.lat,p.timestampMs,p.accuracyM,p.activeElapsedMs].every(Number.isFinite)||Math.abs(p.lng)>180||Math.abs(p.lat)>90||p.accuracyM<=0||
      p.timestampMs<=timestamp||p.activeElapsedMs!<0||p.activeElapsedMs!<elapsed||p.activeElapsedMs!>s.elapsedMs||typeof p.breakBefore!=='boolean')
      throw new Error('This recovery record cannot be opened.');
    timestamp=p.timestampMs;elapsed=p.activeElapsedMs!;
  }
}
