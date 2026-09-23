import {expect,it} from 'vitest';
import {athleteStats} from './athlete-stats';
import type {ActivitySummary} from './storage';

const record=(date:string,distanceM:number,activityType:'run'|'cycle'='run'):ActivitySummary=>({
  version:1,id:date+activityType,startedAtMs:new Date(date).getTime(),endedAtMs:new Date(date).getTime()+1800000,
  source:'gps',activityType,snapshot:{status:'complete',elapsedMs:1800000,distanceM,speedMps:0,progress:0},sampleCount:10,
});

it('summarizes the last seven calendar days without inventing a trend baseline',()=>{
  const today=new Date('2026-09-20T12:00:00');
  const stats=athleteStats([record('2026-09-20T09:00:00',3000),record('2026-09-18T09:00:00',2000,'cycle'),record('2026-09-10T09:00:00',1000)],today);
  expect(stats.weekDistanceM).toBe(5000);
  expect(stats.priorWeekM).toBe(1000);
  expect(stats.weekChangePercent).toBe(400);
  expect(stats.days.at(-1)).toMatchObject({distanceM:3000,count:1});
  expect(stats.trend).toHaveLength(2);
  expect(stats.movementPaceSeconds).toBe(900);
  expect(stats.historyDays).toHaveLength(84);
  expect(stats.historyDays.at(-1)).toMatchObject({distanceM:3000,count:1});
  expect(athleteStats([],today).weekChangePercent).toBeNull();
});
