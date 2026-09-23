import {expect,it} from 'vitest';
import {HybridSpeed} from './hybrid-speed';
import {activityProfiles} from './tracking-config';

it('derives speed when the browser has no speed estimate and only blends a plausible one',()=>{
  const estimator=new HybridSpeed(activityProfiles.run);
  expect(estimator.update(15,5,null,5)).toBeCloseTo(3);
  expect(estimator.update(15,5,4,5)).toBeGreaterThan(3);
  expect(estimator.update(15,5,14,5)).toBeLessThan(4);
  expect(estimator.update(15,5,4,45)).toBeLessThan(4);
});

it('resets after a recording gap instead of inventing travel speed',()=>{
  const estimator=new HybridSpeed(activityProfiles.cycle);
  estimator.update(40,5,8,5);
  expect(estimator.update(0,60,8,5,true)).toBe(0);
  expect(estimator.update(30,5,null,5)).toBeCloseTo(6);
});
