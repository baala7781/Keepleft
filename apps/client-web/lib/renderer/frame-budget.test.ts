import {expect,it} from 'vitest';
import {FrameBudget} from './frame-budget';

it('ignores isolated stalls and degrades gradually only under sustained pressure',()=>{
  const budget=new FrameBudget();let now=10000;
  for(let i=0;i<180;i++){now+=16;budget.update(i===80?180:16,now);}
  expect(budget.shadows).toBe(true);
  for(let i=0;i<90;i++){now+=34;budget.update(34,now);}
  expect(budget.shadows).toBe(false);expect(budget.pixelRatioLimit).toBe(1.25);
  for(let i=0;i<180;i++){now+=34;budget.update(34,now);}
  expect(budget.pixelRatioLimit).toBe(1);
  for(let i=0;i<500;i++){now+=8;budget.update(8,now);}
  expect(budget.pixelRatioLimit).toBe(1);
});
it('responds to repeated severe stalls even when most frames are fast',()=>{
  const budget=new FrameBudget();let now=10000;
  for(let i=0;i<90;i++){const dt=i%30===0?120:16;now+=dt;budget.update(dt,now);}
  expect(budget.pixelRatioLimit).toBe(1.25);
});
