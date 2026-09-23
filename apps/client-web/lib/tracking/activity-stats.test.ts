import {describe,it,expect} from 'vitest';
import {activityStats,formatActivityTime} from './activity-stats';
import type {SavedActivity} from './storage';

const record:SavedActivity={version:1,id:'run',source:'gps',startedAtMs:0,endedAtMs:600000,
  snapshot:{status:'complete',elapsedMs:600000,distanceM:2000,speedMps:0,progress:0},
  samples:[
    {lng:0,lat:0,timestampMs:0,accuracyM:8,breakBefore:true},
    {lng:0,lat:.001,timestampMs:1000,accuracyM:4,breakBefore:false},
    {lng:0,lat:.002,timestampMs:2000,accuracyM:6,breakBefore:true},
    {lng:0,lat:.003,timestampMs:3000,accuracyM:10,breakBefore:false},
  ]};

describe('activity details',()=>{
  it('derives stable running metrics without modifying the saved activity',()=>{
    const before=structuredClone(record),stats=activityStats(record);
    expect(stats).toEqual({distanceKm:2,activeTime:'10:00',averagePace:'5:00 /km',averageSpeedKph:12,sampleCount:4,segmentCount:2,medianAccuracyM:7});
    expect(record).toEqual(before);
  });
  it('handles zero-distance and long-duration activities honestly',()=>{
    const zero={...record,snapshot:{...record.snapshot,distanceM:0,elapsedMs:3661000},samples:[]};
    expect(activityStats(zero)).toMatchObject({activeTime:'1:01:01',averagePace:'—',averageSpeedKph:0,sampleCount:0,segmentCount:0,medianAccuracyM:null});
    expect(formatActivityTime(-1)).toBe('0:00');
  });
  it('does not invent an average pace for a short GPS wander',()=>{
    const drift={...record,snapshot:{...record.snapshot,distanceM:28,elapsedMs:600000}};
    expect(activityStats(drift).averagePace).toBe('—');
  });
});
