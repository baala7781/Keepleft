import type {ActivitySummary} from './storage';

const dayKey=(date:Date)=>`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
const paceSeconds=(activity:ActivitySummary)=>activity.snapshot.distanceM>=100&&activity.snapshot.elapsedMs>0?
  activity.snapshot.elapsedMs/1000/(activity.snapshot.distanceM/1000):null;

export type ActivityHistoryGroup={dateLabel:string;dateMs:number;entries:ActivityHistoryEntry[]};
export type ActivityHistoryEntry={id:string;activityType:string;distanceM:number;elapsedMs:number;paceSeconds:number|null;speedKph:number;startedAtMs:number};

function groupByDate(activities:ActivitySummary[]):ActivityHistoryGroup[]{
  const sorted=[...activities].sort((a,b)=>b.startedAtMs-a.startedAtMs);
  const groups:ActivityHistoryGroup[]=[];
  let current:ActivityHistoryGroup|null=null;
  for(const activity of sorted){
    const date=new Date(activity.startedAtMs);
    const key=dayKey(date);
    const label=date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
    if(!current||dayKey(new Date(current.dateMs))!==key){
      current={dateLabel:label,dateMs:date.getTime(),entries:[]};groups.push(current);
    }
    const pace=paceSeconds(activity);
    const speed=activity.snapshot.elapsedMs>0?activity.snapshot.distanceM/(activity.snapshot.elapsedMs/1000)*3.6:0;
    current.entries.push({id:activity.id,activityType:activity.activityType||'run',distanceM:activity.snapshot.distanceM,elapsedMs:activity.snapshot.elapsedMs,paceSeconds:pace,speedKph:speed,startedAtMs:activity.startedAtMs});
  }
  return groups;
}

export function athleteStats(activities:ActivitySummary[],today=new Date()){
  const historyDays=Array.from({length:84},(_,index)=>{
    const date=new Date(today.getFullYear(),today.getMonth(),today.getDate());date.setDate(date.getDate()-83+index);
    const entries=activities.filter(activity=>dayKey(new Date(activity.startedAtMs))===dayKey(date));
    return {key:dayKey(date),date:date.getTime(),distanceM:entries.reduce((sum,activity)=>sum+activity.snapshot.distanceM,0),count:entries.length};
  });
  const days=Array.from({length:7},(_,index)=>{
    const date=new Date(today.getFullYear(),today.getMonth(),today.getDate());date.setDate(date.getDate()-6+index);
    const runs=activities.filter(activity=>dayKey(new Date(activity.startedAtMs))===dayKey(date));
    return {key:dayKey(date),label:date.toLocaleDateString(undefined,{weekday:'short'}),date:date.getDate(),
      distanceM:runs.reduce((sum,activity)=>sum+activity.snapshot.distanceM,0),count:runs.length};
  });
  const currentKeys=new Set(days.map(day=>day.key));
  const lastWeekStart=new Date(today.getFullYear(),today.getMonth(),today.getDate());lastWeekStart.setDate(lastWeekStart.getDate()-13);
  const priorWeekEnd=new Date(today.getFullYear(),today.getMonth(),today.getDate());priorWeekEnd.setDate(priorWeekEnd.getDate()-6);
  const priorWeekM=activities.filter(activity=>{
    const date=new Date(activity.startedAtMs);return date>=lastWeekStart&&date<priorWeekEnd;
  }).reduce((sum,activity)=>sum+activity.snapshot.distanceM,0);
  const weekDistanceM=days.reduce((sum,day)=>sum+day.distanceM,0);
  const movement=activities.filter(activity=>activity.activityType!=='cycle');
  const movementDistance=movement.reduce((sum,activity)=>sum+activity.snapshot.distanceM,0);
  const movementTime=movement.reduce((sum,activity)=>sum+activity.snapshot.elapsedMs,0);
  const trend=movement.filter(activity=>paceSeconds(activity)!==null).slice(0,8).reverse()
    .map(activity=>({date:activity.startedAtMs,secondsPerKm:paceSeconds(activity)!}));
  return {days,weekDistanceM,priorWeekM,weekChangePercent:priorWeekM>0?Math.round((weekDistanceM/priorWeekM-1)*100):null,
    totalDistanceM:activities.reduce((sum,activity)=>sum+activity.snapshot.distanceM,0),
    totalTimeMs:activities.reduce((sum,activity)=>sum+activity.snapshot.elapsedMs,0),
    count:activities.length,movementPaceSeconds:movementDistance>=100&&movementTime>0?movementTime/1000/(movementDistance/1000):null,
    trend,historyDays,activeThisWeek:activities.filter(activity=>currentKeys.has(dayKey(new Date(activity.startedAtMs)))).length,
    recentActivities:groupByDate(activities)};
}
