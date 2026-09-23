import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {MercatorCoordinate,type Map as MapLibreMap} from 'maplibre-gl';
import {createWorldLayer} from './world';
import {ActivityRuntime} from '../tracking/activity';
import {neutralCamera,type CameraControls} from './camera';
import type {WorldWork} from './background-work';
import {createWorldWorkHandler} from './world-work-handler';
import {loadAthlete} from './athlete';
vi.mock('./athlete',()=>({loadAthlete:vi.fn().mockRejectedValue(new Error('Synthetic model unavailable'))}));

const observed=vi.hoisted(()=>({scenes:[] as unknown[],viewport:[] as number[],disposed:0,workFactory:undefined as (()=>WorldWork)|undefined}));
vi.mock('./world-work-client',()=>({createWorldWork:()=>observed.workFactory?.()}));
vi.mock('three',async importOriginal=>{
  const actual=await importOriginal<typeof import('three')>();
  return {...actual,WebGLRenderer:class {
    shadowMap={enabled:false,needsUpdate:false};info={render:{calls:1,triangles:0},memory:{geometries:0}};
    resetState(){}setViewport(...args:number[]){observed.viewport=args;}
    render(scene:unknown){observed.scenes.push(scene);}dispose(){observed.disposed++;}
  }};
});

it('commits camera/theme after all map layers, keeps the scene, and removes its listener',()=>{
  const handlers=new Map<string,()=>void>(),origin={lng:0,lat:0};
  const map={
    getCanvas:()=>({width:393,height:851,clientWidth:393,clientHeight:851}),
    on:vi.fn((event:string,fn:()=>void)=>handlers.set(event,fn)),off:vi.fn((event:string)=>handlers.delete(event)),
    getCenter:()=>origin,getZoom:()=>16,getPitch:()=>58,getBearing:()=>0,isMoving:()=>false,
    jumpTo:vi.fn(),setPixelRatio:vi.fn(),triggerRepaint:vi.fn(),setPaintProperty:vi.fn(),getLayer:()=>({}),
    getSource:()=>undefined,querySourceFeatures:()=>[],
  };
  const controls:CameraControls={mode:'orbit',revision:0,selected:false,reducedMotion:true,gesturing:false,quality:'balanced',adjustment:neutralCamera(),staticScene:true};
  const runtime=new ActivityRuntime(),layer=createWorldLayer(runtime,MercatorCoordinate,{type:'FeatureCollection',features:[]},controls,()=>{},origin);
  const gl={drawingBufferWidth:786,drawingBufferHeight:1702} as WebGL2RenderingContext;
  layer.onAdd!(map as unknown as MapLibreMap,gl);
  const args={defaultProjectionData:{mainMatrix:new THREE.Matrix4().toArray()}} as Parameters<typeof layer.render>[1];
  layer.render(gl,args);
  expect(map.jumpTo).not.toHaveBeenCalled();expect(map.setPaintProperty).not.toHaveBeenCalled();
  expect(observed.viewport).toEqual([0,0,786,1702]);
  handlers.get('render')!();expect(map.jumpTo).toHaveBeenCalledTimes(1);
  const scene=observed.scenes.at(-1),snapshot=runtime.getSnapshot();
  controls.worldTheme='night';layer.render(gl,args);handlers.get('render')!();
  expect(observed.scenes.at(-1)).toBe(scene);expect(runtime.getSnapshot()).toEqual(snapshot);
  expect(map.jumpTo).toHaveBeenCalledTimes(1);expect(map.setPixelRatio).not.toHaveBeenCalled();
  expect(loadAthlete).not.toHaveBeenCalled();
  expect(map.setPaintProperty).toHaveBeenCalledWith('ground','background-color','#111416');
  layer.onRemove!(map as unknown as MapLibreMap,gl);expect(handlers.has('render')).toBe(false);expect(observed.disposed).toBe(1);
  runtime.dispose();
});

it('streams replacement geometry into the same map layer without resetting the activity',()=>{
  const origin={lng:0,lat:0};
  const map={
    getCanvas:()=>({width:393,height:851,clientWidth:393,clientHeight:851}),
    on:vi.fn(),off:vi.fn(),getCenter:()=>origin,getZoom:()=>16,getPitch:()=>58,getBearing:()=>0,isMoving:()=>false,
    jumpTo:vi.fn(),setPixelRatio:vi.fn(),triggerRepaint:vi.fn(),setPaintProperty:vi.fn(),getLayer:()=>({}),
    getSource:()=>undefined,querySourceFeatures:()=>[],
  };
  const controls:CameraControls={mode:'free',revision:0,selected:false,reducedMotion:true,gesturing:false,quality:'balanced',adjustment:neutralCamera(),staticScene:true};
  const runtime=new ActivityRuntime(),layer=createWorldLayer(runtime,MercatorCoordinate,{type:'FeatureCollection',features:[]},controls,()=>{},origin);
  const gl={drawingBufferWidth:786,drawingBufferHeight:1702} as WebGL2RenderingContext;
  layer.onAdd!(map as unknown as MapLibreMap,gl);
  const args={defaultProjectionData:{mainMatrix:new THREE.Matrix4().toArray()}} as Parameters<typeof layer.render>[1];
  layer.render(gl,args);
  const scene=observed.scenes.at(-1) as THREE.Scene;
  const mesh=scene.getObjectByName('buildings-far') as THREE.Mesh;
  const disposed=vi.spyOn(mesh.geometry,'dispose');
  expect(mesh.visible).toBe(false);
  const snapshot=runtime.getSnapshot();
  layer.replaceWorld({type:'FeatureCollection',features:[{
    type:'Feature',id:'building-1',properties:{kind:'building',height:12},
    geometry:{type:'Polygon',coordinates:[[[0,0],[.0001,0],[.0001,.0001],[0,.0001],[0,0]]]},
  }]});
  layer.render(gl,args);
  expect(observed.scenes.at(-1)).toBe(scene);
  expect(scene.getObjectByName('building-world')!.children.some(m=>m.visible&&(m as THREE.Mesh).geometry.attributes.position.count>0)).toBe(true);
  expect(disposed).toHaveBeenCalledOnce();
  expect(runtime.getSnapshot()).toEqual(snapshot);
  expect(map.jumpTo).not.toHaveBeenCalled();
  layer.onRemove!(map as unknown as MapLibreMap,gl);runtime.dispose();
});
it('stages browser replacements without clearing the current scene and cancels on removal',async()=>{
  const frames=new Map<number,FrameRequestCallback>();let sequence=0;
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++sequence,callback);return sequence;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
  observed.workFactory=()=>{const run=createWorldWorkHandler();return {run:async job=>run(job) as never,dispose:()=>{}};};
  const origin={lng:0,lat:0},map={getCanvas:()=>({width:400,height:800,clientWidth:400,clientHeight:800}),on:vi.fn(),off:vi.fn(),getCenter:()=>origin,getZoom:()=>16,getPitch:()=>58,getBearing:()=>0,isMoving:()=>false,jumpTo:vi.fn(),triggerRepaint:vi.fn(),getSource:()=>undefined};
  const controls:CameraControls={mode:'free',revision:0,selected:false,reducedMotion:true,gesturing:false,quality:'balanced',adjustment:neutralCamera(),staticScene:true};
  const runtime=new ActivityRuntime(),layer=createWorldLayer(runtime,MercatorCoordinate,{type:'FeatureCollection',features:[]},controls,()=>{},origin),gl={drawingBufferWidth:400,drawingBufferHeight:800} as WebGL2RenderingContext;
  const args={defaultProjectionData:{mainMatrix:new THREE.Matrix4().toArray()}} as Parameters<typeof layer.render>[1];
  try{
    layer.onAdd!(map as unknown as MapLibreMap,gl);layer.render(gl,args);
    const scene=observed.scenes.at(-1) as THREE.Scene,original=scene.getObjectByName('building-world');
    const trees=scene.getObjectByName('tree-broadleaf-far') as THREE.InstancedMesh,treeGeometry=trees.geometry,treeBuffer=trees.instanceMatrix;
    const next={type:'FeatureCollection' as const,features:[{type:'Feature' as const,id:'new',properties:{kind:'building' as const,height:12},geometry:{type:'Polygon' as const,coordinates:[[[0,0],[.001,0],[.001,.001],[0,.001],[0,0]]]}}]};
    layer.replaceWorld(next);await vi.waitFor(()=>expect(frames.size).toBe(1));
    const step=()=>{const [id,callback]=[...frames][0];frames.delete(id);callback(performance.now());};
    for(let i=0;i<4;i++){step();expect(scene.getObjectByName('building-world')).toBe(original);}
    step();expect(scene.getObjectByName('building-world')).not.toBe(original);expect(frames.size).toBe(0);
    expect(scene.getObjectByName('tree-broadleaf-far')).toBe(trees);expect(trees.geometry).toBe(treeGeometry);expect(trees.instanceMatrix).toBe(treeBuffer);
    layer.replaceWorld({...next,features:[{...next.features[0],properties:{...next.features[0].properties,height:20}}]});await vi.waitFor(()=>expect(frames.size).toBe(1));
    step();layer.onRemove!(map as unknown as MapLibreMap,gl);expect(frames.size).toBe(0);
  }finally{observed.workFactory=undefined;vi.unstubAllGlobals();runtime.dispose();}
});
