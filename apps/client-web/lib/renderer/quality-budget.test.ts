import {expect,it} from 'vitest';
import {renderPixelRatio} from './quality-budget';

it('chooses a stable Android drawing ratio before the shared map canvas is created',()=>{
  expect(renderPixelRatio('balanced',3,true)).toBe(1);
  expect(renderPixelRatio('high',3,true)).toBe(1.25);
  expect(renderPixelRatio('balanced',2,false)).toBe(1.25);
  expect(renderPixelRatio('battery',.8,true)).toBe(1);
});
