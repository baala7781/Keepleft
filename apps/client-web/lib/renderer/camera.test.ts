import {it,expect,vi} from 'vitest';
import {overviewZoom,chaseCamera,turnToward,baseCamera,rememberCamera,trackingAdjustment,automaticObstruction,selectedCameraAdjustment,adjustedCamera,CameraGestureGuard,type CameraMode} from './camera';
it('resumes tracking the runner after panning without losing manual angle or zoom',()=>{
  const base=baseCamera('follow',{lng:0,lat:0,heading:0},{lng:0,lat:0},400,850),manual={center:{lng:.001,lat:.001},zoom:19,pitch:72,bearing:220};
  const a=trackingAdjustment('follow',base,manual),next=adjustedCamera(base,a);
  expect(next.center.lng).toBe(0);expect(next.center.lat).toBe(0);expect(next.zoom).toBe(19);expect(next.pitch).toBe(72);expect(next.bearing).toBe(220);
  expect(trackingAdjustment('free',base,manual).lng).toBeCloseTo(.001);
});
it('keeps obstruction safety available in tracking modes after manual framing',()=>{
  expect(automaticObstruction('follow')).toBe(true);expect(automaticObstruction('chase')).toBe(true);
  expect(automaticObstruction('free')).toBe(false);expect(automaticObstruction('orbit')).toBe(false);
});
it('starts selected tracking modes at their presets and preserves framing only for free exploration',()=>{
  const origin={lng:0,lat:0},point={lng:.001,lat:.002,heading:1};
  const composed={center:{lng:.0008,lat:.0018},zoom:20.5,pitch:69,bearing:124};
  for(const mode of ['orbit','follow','chase','free'] as CameraMode[]){
    const base=baseCamera(mode,point,origin,520,800);
    const result=adjustedCamera(base,selectedCameraAdjustment(mode,base,composed));
    const expected=mode==='free'?composed:base;
    expect(result.zoom).toBe(expected.zoom);expect(result.pitch).toBe(expected.pitch);
    expect(result.bearing).toBeCloseTo(expected.bearing);
    expect(result.center.lng).toBeCloseTo(expected.center.lng);expect(result.center.lat).toBeCloseTo(expected.center.lat);
  }
});
it('suspends automation throughout multi-touch and inertia then captures once',()=>{
  const controls={gesturing:false},capture=vi.fn(),guard=new CameraGestureGuard(controls,capture);
  guard.pointerDown(1);guard.pointerDown(2);guard.settle(false);
  expect(controls.gesturing).toBe(true);expect(capture).not.toHaveBeenCalled();
  guard.pointerUp(1);guard.settle(false);expect(capture).not.toHaveBeenCalled();
  guard.pointerUp(2);guard.settle(true);expect(controls.gesturing).toBe(true);
  guard.settle(false);guard.settle(false);expect(capture).toHaveBeenCalledTimes(1);expect(controls.gesturing).toBe(false);
});
it('settles wheel/keyboard gestures and canceled pointers without changing modes',()=>{
  const controls={gesturing:false,mode:'follow'},capture=vi.fn(),guard=new CameraGestureGuard(controls,capture);
  guard.begin();guard.settle(false);guard.pointerDown(3);guard.clearPointers();guard.settle(false);
  expect(capture).toHaveBeenCalledTimes(2);expect(controls.mode).toBe('follow');
});
it('widens the fixture overview on small screens within supported zoom bounds',()=>{
  expect(overviewZoom(520)).toBe(15.25);
  expect(overviewZoom(320)).toBeLessThan(overviewZoom(700));
  expect(overviewZoom(0)).toBe(14.8);
  expect(overviewZoom(2400)).toBe(15.8);
});
it('retains a gesture adjustment while the selected chase view follows a moving runner',()=>{
  const origin={lng:0,lat:0},point={...origin,heading:Math.PI};
  const base=baseCamera('chase',point,origin,520,800),manual={...base,zoom:base.zoom-1,pitch:65,bearing:base.bearing+35,center:{lng:.00005,lat:.0001}};
  const adjustment=rememberCamera(base,manual),restored=adjustedCamera(base,adjustment);
  expect(restored.center.lng).toBeCloseTo(manual.center.lng,10);expect(restored.center.lat).toBeCloseTo(manual.center.lat,10);expect(restored.zoom).toBe(manual.zoom);
  const next=adjustedCamera(baseCamera('chase',{...point,lat:.001},origin,520,800),adjustment);
  expect(next.center.lat-manual.center.lat).toBeCloseTo(.001);expect(next.pitch).toBe(65);expect(next.bearing).toBe(35);
});
it('looks forward along north/east routes and stays close across viewport sizes',()=>{
  const north=chaseCamera({lng:0,lat:0,heading:Math.PI},800);
  expect(north.bearing).toBeCloseTo(0);expect(north.center.lat).toBeGreaterThan(0);expect(north.center.lng).toBeCloseTo(0);
  const east=chaseCamera({lng:0,lat:0,heading:Math.PI/2},800);
  expect(east.bearing).toBeCloseTo(90);expect(east.center.lng).toBeGreaterThan(0);
  expect(north.pitch).toBe(62);expect(north.zoom).toBeGreaterThan(21);
  const small=chaseCamera({lng:0,lat:0,heading:0},400);expect(north.zoom-small.zoom).toBeCloseTo(1);
});
it('turns through the shortest bearing arc and wraps dateline targets',()=>{
  expect(turnToward(179,-179,.5)).toBe(180);
  expect(turnToward(-179,179,.5)).toBe(-180);
  const target=chaseCamera({lng:179.999999,lat:0,heading:Math.PI/2},800);
  expect(target.center.lng).toBeGreaterThanOrEqual(-180);expect(target.center.lng).toBeLessThan(0);
});
