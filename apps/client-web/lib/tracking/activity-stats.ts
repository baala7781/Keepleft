import type {SavedActivity} from './storage';

export type ActivityStats={
  distanceKm:number;activeTime:string;averagePace:string;averageSpeedKph:number;
  sampleCount:number;segmentCount:number;medianAccuracyM:number|null;
};

export function formatActivityTime(ms:number){
  const seconds=Math.max(0,Math.floor(ms/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60;
  return hours?`${hours}:${minutes.toString().padStart(2,'0')}:${rest.toString().padStart(2,'0')}`:`${minutes}:${rest.toString().padStart(2,'0')}`;
}

export function activityStats(activity:SavedActivity):ActivityStats {
  const distanceM=Math.max(0,activity.snapshot.distanceM),elapsedMs=Math.max(0,activity.snapshot.elapsedMs);
  const paceSeconds=distanceM>=100&&elapsedMs>0?elapsedMs/1000/(distanceM/1000):Infinity;
  const accuracies=activity.samples.map(p=>p.accuracyM).filter(n=>Number.isFinite(n)&&n>0).sort((a,b)=>a-b);
  const middle=Math.floor(accuracies.length/2);
  const medianAccuracyM=accuracies.length?(accuracies.length%2?accuracies[middle]:(accuracies[middle-1]+accuracies[middle])/2):null;
  return {
    distanceKm:distanceM/1000,
    activeTime:formatActivityTime(elapsedMs),
    averagePace:Number.isFinite(paceSeconds)&&paceSeconds<=3600?`${Math.floor(paceSeconds/60)}:${Math.floor(paceSeconds%60).toString().padStart(2,'0')} /km`:'—',
    averageSpeedKph:elapsedMs>0?distanceM/(elapsedMs/1000)*3.6:0,
    sampleCount:activity.samples.length,
    segmentCount:activity.samples.reduce((count,p,index)=>count+(index===0||p.breakBefore?1:0),0),
    medianAccuracyM,
  };
}
