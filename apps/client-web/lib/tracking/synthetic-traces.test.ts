import {describe,expect,it} from 'vitest';
import {GPSFilter,type ActivityType,type RawFix} from './location';
import stationary from './fixtures/stationary.json';
import walk from './fixtures/walk-1km.json';
import run from './fixtures/run-5km.json';
import cycle from './fixtures/cycle-10km.json';
import city from './fixtures/noisy-city.json';
import parking from './fixtures/parking-garage.json';
import jumps from './fixtures/gps-jumps.json';
import loss from './fixtures/signal-loss.json';

type Fixture={kind:string;activity:string;expectedDistanceM:number;toleranceM:number;accuracyM:number;meters?:number;
  segmentMeters?:number;durationSeconds?:number;intervalSeconds?:number;noiseMeters?:number;spikeMeters?:number;gapMeters?:number;gapSeconds?:number;coarseAccuracyM?:number};
const epoch=1700000000000;
const fix=(seconds:number,eastM:number,northM=0,accuracyM=5):RawFix=>({timestampMs:epoch+seconds*1000,
  lng:eastM/111195,lat:northM/111195,accuracyM});

function trace(data:Fixture):RawFix[]{
  if(data.kind==='parking')return [0,10,20,30,40].map((east,i)=>fix(i*5,east,0,data.accuracyM)).concat([
    fix(25,540,150,data.coarseAccuracyM),fix(35,620,190,data.coarseAccuracyM),fix(50,43,0,data.accuracyM)]);
  if(data.kind==='gap')return [0,10,20,30,40,50].map((east,i)=>fix(i*5,east)).concat(
    [0,10,20,30,40,50].map((east,i)=>fix(25+data.gapSeconds!+i*5,50+data.gapMeters!+east)));
  const count=Math.round(data.durationSeconds!/data.intervalSeconds!);
  return Array.from({length:count+1},(_,i)=>{
    const ratio=i/count,east=(data.meters||0)*ratio;
    const noise=data.kind==='stationary'?(i%2?data.noiseMeters!:-data.noiseMeters!):data.noiseMeters?(i%2?data.noiseMeters:-data.noiseMeters):0;
    return fix(i*data.intervalSeconds!,east+(data.kind==='jump'&&i===Math.floor(count/2)?data.spikeMeters!:0),noise,data.accuracyM);
  });
}

describe('known synthetic GPS traces',()=>{
  for(const [name,fixture] of Object.entries({stationary,walk,run,cycle,city,parking,jumps,loss})){
    it(`${name} stays within its declared measurement tolerance`,()=>{
      const data=fixture as Fixture,filter=new GPSFilter(data.activity as ActivityType);
      const actual=trace(data).reduce((sum,sample)=>sum+filter.ingest(sample,sample.timestampMs).distanceM,0);
      expect(Math.abs(actual-data.expectedDistanceM)).toBeLessThanOrEqual(data.toleranceM);
    });
  }
});
