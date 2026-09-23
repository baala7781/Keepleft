import {it,expect} from 'vitest';
import {dragAngle} from './touch-angle';
it('lets a finger rotate and tilt in either direction without exceeding camera limits',()=>{
  expect(dragAngle(0,45,100,-80)).toEqual({bearing:-35,pitch:65});
  expect(dragAngle(0,45,-100,80)).toEqual({bearing:35,pitch:25});
  expect(dragAngle(0,75,0,-200).pitch).toBe(80);
  expect(dragAngle(0,5,0,200).pitch).toBe(0);
});
