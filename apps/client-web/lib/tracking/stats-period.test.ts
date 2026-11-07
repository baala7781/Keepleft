import {it,expect} from 'vitest';
import {statsPeriod} from './stats-period';
import type {ActivitySummary} from './storage';
const record=(date:string,type:'run'|'cycle'='run'):ActivitySummary=>({version:1,id:date,startedAtMs:+new Date(date),endedAtMs:+new Date(date)+1000,source:'gps',activityType:type,sampleCount:2,snapshot:{status:'complete',elapsedMs:1000,distanceM:1000,speedMps:0,progress:1}});
it('filters calendar periods and activity kinds without mutating saved metrics',()=>{
  const records=[record('2026-09-19T23:59:59'),record('2026-09-20T00:00:00'),record('2026-09-25T12:00:00','cycle'),record('2026-09-27T00:00:00')];
  const before=JSON.stringify(records),result=statsPeriod(records,7,'all',new Date('2026-09-26T12:00:00'));
  expect(result.current).toHaveLength(2);expect(result.distanceM).toBe(2000);expect(result.change).toBe(100);expect(result.buckets.reduce((sum,item)=>sum+item.distanceM,0)).toBe(2000);
  expect(statsPeriod(records,7,'cycle',new Date('2026-09-26T12:00:00')).current).toHaveLength(1);expect(JSON.stringify(records)).toBe(before);
});
it('has no invented comparison for an empty period',()=>{const result=statsPeriod([],365,'all',new Date('2026-09-26T12:00:00'));expect(result.change).toBeNull();expect(result.buckets).toHaveLength(13);});
