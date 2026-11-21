import {it,expect} from 'vitest';
import {DisplaySpeed} from './display-speed';
import {initialSnapshot} from './activity';
const sample=(time:number,distance:number)=>({...initialSnapshot,status:'recording' as const,elapsedMs:time,distanceM:distance,speedMps:0});
it('holds a recent walking pace across stationary callbacks between movement samples',()=>{
  const speed=new DisplaySpeed(),values:number[]=[];
  for(let t=0;t<=20000;t+=1000){const v=speed.read(sample(t,Math.floor(t/3000)*4.2));if(t>=8000)values.push(v);}
  expect(Math.min(...values)).toBeGreaterThan(.8);expect(Math.max(...values)).toBeLessThan(1.8);
  expect(speed.read(sample(21000,28))).toBe(speed.read(sample(21000,28)));
});
it('reaches zero at a real stop and resets immediately on pause, stale GPS and new sessions',()=>{
  const speed=new DisplaySpeed();for(let t=0;t<=10000;t+=1000)speed.read(sample(t,t/1000));
  for(let t=11000;t<=19000;t+=1000)speed.read(sample(t,10));expect(speed.read(sample(20000,10))).toBe(0);
  expect(speed.read({...sample(20000,10),status:'paused'})).toBe(0);
  expect(speed.read(sample(21000,10),false)).toBe(0);expect(speed.read(sample(0,0))).toBe(0);
});
it('holds the speed through a brief GPS dropout, then drops to zero if the signal stays lost',()=>{
  const speed=new DisplaySpeed();let held=0;
  for(let t=0;t<=10000;t+=1000)held=speed.read(sample(t,t*3/1000));
  expect(held).toBeGreaterThan(2);
  expect(speed.read(sample(11000,33),false)).toBe(held);
  expect(speed.read(sample(14000,42),false)).toBe(held);
  expect(speed.read(sample(17000,51),false)).toBe(0);
  const recovered=speed.read(sample(18000,54));expect(recovered).toBeGreaterThanOrEqual(0);
});
