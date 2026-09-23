import {it,expect} from 'vitest';
import {SteadyHeading} from './steady-heading';
it('does not chase metre-scale jitter or turn a stationary person',()=>{
  const h=new SteadyHeading();h.update(0,0,Math.PI,.1,true);
  for(let i=0;i<30;i++)expect(h.update(i%2,1,0,.1,true)).toBeCloseTo(Math.PI);
  expect(h.update(12,0,0,.1,false)).toBeCloseTo(Math.PI);
});
it('follows real turns gradually, including a genuine return trip',()=>{
  const h=new SteadyHeading();h.update(0,0,Math.PI,.1,true);h.update(0,-8,Math.PI,.1,true);
  let prior=Math.PI;for(let i=0;i<100;i++){const next=h.update(0,2,0,.1,true);expect(Math.abs(next-prior)).toBeLessThanOrEqual(3.5*Math.PI/180+.00001);prior=next;}
  expect(Math.abs(prior%(Math.PI*2))).toBeLessThan(.1);
});
