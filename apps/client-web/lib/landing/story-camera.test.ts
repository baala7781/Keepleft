import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import manifest from '@/public/fixtures/hussain-sagar/manifest.json';
import {ReplayRuntime} from '../tracking/replay';
import {applyAssembly} from '../renderer/world-assembly';
import {assemblyAt,buildStep,cameraKeys,demoActivity,formatStats,ramp,replayView,routeAt,sampleKeys,storyPosition} from './story-camera';

describe('landing story timeline',()=>{
  it('keeps camera keys ordered and every pose finite across the page',()=>{
    for(let i=1;i<cameraKeys.length;i++)expect(cameraKeys[i].s).toBeGreaterThan(cameraKeys[i-1].s);
    let previous=sampleKeys(cameraKeys,0);
    for(let s=0;s<=6;s+=.01){
      const pose=sampleKeys(cameraKeys,s);
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      expect(pose.pitch).toBeLessThanOrEqual(85);
      // Continuous: no camera jumps between neighbouring scroll positions.
      expect(Math.abs(pose.bearing-previous.bearing)).toBeLessThan(25);
      expect(Math.abs(pose.zoom-previous.zoom)).toBeLessThan(.3);
      previous=pose;
    }
  });
  it('is a pure function of scroll position',()=>{
    expect(sampleKeys(cameraKeys,3.37)).toEqual(sampleKeys(cameraKeys,3.37));
    expect(routeAt(4.6)).toBe(routeAt(4.6));
  });
  it('rewinds and redraws the route for the track and replay sections',()=>{
    expect(routeAt(0)).toBe(1);
    expect(routeAt(1.05)).toBeLessThan(.1);
    expect(routeAt(1.95)).toBe(1);
    expect(routeAt(4.2)).toBe(0);
    expect(routeAt(5.2)).toBe(1);
  });
  it('flattens then raises buildings before trees in the build section',()=>{
    expect(assemblyAt(1.5)).toEqual({buildings:1,trees:1,water:1});
    expect(assemblyAt(2.4).buildings).toBe(0);
    const rising=assemblyAt(2.62);
    expect(rising.buildings).toBeGreaterThan(rising.trees);
    expect(assemblyAt(3.2)).toEqual({buildings:1,trees:1,water:1});
    expect(buildStep(2.1)).toBe(0);expect(buildStep(2.99)).toBe(4);
    expect(replayView(4.0)).toBe(0);expect(replayView(4.95)).toBe(3);
  });
  it('maps scroll probes to sections',()=>{
    const tops=[0,1000,3000],heights=[1000,2000,500];
    expect(storyPosition(-10,tops,heights)).toBe(0);
    expect(storyPosition(500,tops,heights)).toBeCloseTo(.5);
    expect(storyPosition(2000,tops,heights)).toBeCloseTo(1.5);
    expect(storyPosition(9000,tops,heights)).toBeLessThan(3);
    expect(ramp(5,[[0,0],[10,1]])).toBeCloseTo(.5);
  });
});

describe('landing demo activity',()=>{
  it('replays the bundled public route with monotonic timing and real distance',()=>{
    const activity=demoActivity(manifest.route as [number,number][]);
    expect(activity.source).toBe('demo');
    expect(activity.samples).toHaveLength(manifest.route.length);
    expect(activity.snapshot.distanceM).toBeGreaterThan(1500);
    expect(activity.snapshot.distanceM).toBeLessThan(1900);
    const runtime=new ReplayRuntime(activity);
    runtime.seek(runtime.durationMs/2);
    const half=runtime.getSnapshot();
    expect(half.progress).toBeCloseTo(.5,2);
    expect(half.distanceM).toBeGreaterThan(0);
    runtime.seek(runtime.durationMs);
    expect(runtime.getSnapshot().distanceM).toBeCloseTo(activity.snapshot.distanceM,3);
    runtime.dispose();
  });
  it('formats stats',()=>{
    expect(formatStats(605000,1000)).toEqual({distance:'1.00',time:'10:05',pace:'10\'05"'});
    expect(formatStats(0,0).pace).toBe('–');
  });
});

describe('world assembly',()=>{
  it('scales whole groups vertically without moving them and restores the normal world',()=>{
    const buildings=new THREE.Group(),details=new THREE.Group(),water=new THREE.Group();
    const tree=new THREE.Object3D(),windows=new THREE.Object3D();details.add(tree,windows);
    buildings.position.set(3,0,-4);
    expect(applyAssembly({buildings:0,trees:0,water:1},{buildings,details,vegetation:[tree],water})).toBe(true);
    expect(buildings.visible).toBe(false);expect(tree.visible).toBe(false);
    expect(buildings.position.toArray()).toEqual([3,0,-4]);
    applyAssembly({buildings:.5,trees:.2,water:1},{buildings,details,vegetation:[tree],water});
    expect(buildings.scale.y).toBe(.5);expect(windows.scale.y).toBe(.5);expect(tree.scale.y).toBeCloseTo(.2);
    expect(buildings.scale.x).toBe(1);
    applyAssembly({buildings:1,trees:1,water:1},{buildings,details,vegetation:[tree],water});
    expect([buildings.scale.y,tree.scale.y,windows.scale.y]).toEqual([1,1,1]);
    expect(buildings.visible&&tree.visible&&water.visible).toBe(true);
    expect(applyAssembly({buildings:1,trees:1,water:1},{buildings,details,vegetation:[tree],water})).toBe(false);
  });
});
