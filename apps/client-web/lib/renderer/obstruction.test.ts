import {expect,it} from 'vitest';
import {clearCameraPitch,StableCameraPitch} from './obstruction';
const wall={minX:-8,maxX:8,minZ:8,maxZ:12,minY:0,maxY:18};
it('does not seesaw when building clearance alternates at a noisy edge',()=>{
  const pitch=new StableCameraPitch();pitch.reset(38);
  for(let i=0;i<120;i++)expect(pitch.update(i%2?62:38,1/60)).toBe(38);
  for(let i=0;i<80;i++)expect(pitch.update(62,1/60)).toBe(38);
  for(let i=0;i<120;i++)pitch.update(62,1/60);
  const resumed=pitch.update(62,1/60);expect(resumed).toBeGreaterThan(38);expect(resumed).toBeLessThan(62);
});
it('bounds pitch movement and respects a new manually selected framing',()=>{
  const pitch=new StableCameraPitch();pitch.reset(62);
  expect(pitch.update(0,1/60)).toBe(61.5);
  expect(pitch.reset(75)).toBe(75);expect(pitch.update(20,0,true)).toBe(20);
});
it('raises the chase view above a wall without moving the runner',()=>{expect(clearCameraPitch(0,0,0,24,62,[wall])).toBeLessThan(40);});
it('keeps the selected pitch on an unobstructed street',()=>{expect(clearCameraPitch(0,0,180,24,62,[wall])).toBe(62);});
it('does not treat an elevated bridge as a wall at ground level',()=>{expect(clearCameraPitch(0,0,0,8,62,[{...wall,minZ:2,maxZ:4,minY:12,maxY:15}])).toBe(62);});
it('does not force a top-down view when noisy GPS is inside a building bound',()=>{expect(clearCameraPitch(0,0,0,24,62,[{...wall,minZ:-4,maxZ:4}])).toBe(62);});
