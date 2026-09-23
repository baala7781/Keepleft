import { describe,expect,it } from 'vitest';
import { LocalENU,FloatingOrigin,toECEF } from '../../../packages/geo';
import { Matrix4, Vector3 } from 'three';

describe('WGS84 local ENU',()=>{
  it('matches ellipsoid reference points',()=>{
    expect(toECEF({lng:0,lat:0})).toEqual({x:6378137,y:0,z:0});
    expect(toECEF({lng:0,lat:90}).z).toBeCloseTo(6356752.314245,5);
  });
  it.each([{lng:78.478,lat:17.421},{lng:179.999,lat:45},{lng:-73.99,lat:-33}])('round trips with altitude near %j',origin=>{
    const frame=new LocalENU(origin);
    const p={lng:origin.lng-0.01,lat:origin.lat+0.005,altitude:530};
    const result=frame.unproject(frame.project(p));
    expect(result.lng).toBeCloseTo(p.lng,8);
    expect(result.lat).toBeCloseTo(p.lat,8);
    expect(result.altitude).toBeCloseTo(530,4);
  });
  it('preserves east/north/up axes and rejects invalid data',()=>{
    const f=new LocalENU({lng:0,lat:0});
    expect(f.project({lng:0.001,lat:0}).x).toBeCloseTo(111.31949,3);
    expect(f.project({lng:0,lat:0.001}).y).toBeCloseTo(110.57427,3);
    expect(f.project({lng:0,lat:0,altitude:30}).z).toBeCloseTo(30,6);
    expect(()=>f.project({lng:NaN,lat:0})).toThrow();
  });
  it('rebases atomically without moving a fixed world point',()=>{
    const f=new LocalENU({lng:78.478,lat:17.421}), floating=new FloatingOrigin(f,600);
    const fixed={lng:78.479,lat:17.423};
    const before=floating.toScene(fixed);
    expect(floating.update(f.unproject({x:599,y:0,z:0}))).toBe(false);
    expect(floating.update(f.unproject({x:700,y:0,z:0}))).toBe(true);
    const after=floating.toScene(fixed), o=floating.offset;
    const restored=new Vector3(after.x,after.y,after.z).applyMatrix4(new Matrix4().makeTranslation(o.x,o.y,o.z));
    expect(restored.distanceTo(new Vector3(before.x,before.y,before.z))).toBeLessThan(1e-6);
    expect(floating.revision).toBe(1);
    expect(floating.update(f.unproject({x:701,y:0,z:0}))).toBe(false);
  });
});
