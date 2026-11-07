import type {ActivitySummary} from './storage';

export function statsPeriod(activities:ActivitySummary[],days:number,type:string,today=new Date()){
  const end=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
  const start=new Date(end);start.setDate(start.getDate()-days);
  const previous=new Date(start);previous.setDate(previous.getDate()-days);
  const matching=activities.filter(item=>type==='all'||(item.activityType||'run')===type);
  const current=matching.filter(item=>item.startedAtMs>=+start&&item.startedAtMs<+end);
  const priorM=matching.filter(item=>item.startedAtMs>=+previous&&item.startedAtMs<+start).reduce((sum,item)=>sum+item.snapshot.distanceM,0);
  const distanceM=current.reduce((sum,item)=>sum+item.snapshot.distanceM,0);
  const bucketSize=days<=7?1:days<=31?5:days<=90?15:30;
  const buckets=Array.from({length:Math.ceil(days/bucketSize)},(_,i)=>{
    const from=new Date(start);from.setDate(from.getDate()+i*bucketSize);
    const until=new Date(from);until.setDate(until.getDate()+bucketSize);
    return {label:from.toLocaleDateString(undefined,days===7?{weekday:'short'}:{month:'short',day:'numeric'}),distanceM:current.filter(item=>item.startedAtMs>=+from&&item.startedAtMs<+until).reduce((sum,item)=>sum+item.snapshot.distanceM,0)};
  });
  return {current,distanceM,buckets,change:priorM>0?Math.round((distanceM/priorM-1)*100):null};
}
