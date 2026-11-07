import {afterEach,expect,it,vi} from 'vitest';
import {createStoryScene} from './scene';
import type {SavedActivity} from '../tracking/storage';
afterEach(()=>vi.unstubAllGlobals());
it('draws a high resolution transparent overlay as vectors and removes owned canvases',async()=>{
  const contexts:Record<string,ReturnType<typeof vi.fn>>[]=[],canvases:{width:number;height:number;className:string;remove:ReturnType<typeof vi.fn>;getContext:()=>unknown}[]=[];
  vi.stubGlobal('document',{createElement:()=>{
    const methods=['clearRect','save','restore','scale','translate','beginPath','moveTo','lineTo','stroke','arc','fill','fillRect','fillText','drawImage'];
    const ctx=Object.fromEntries(methods.map(name=>[name,vi.fn()]));ctx.measureText=vi.fn(()=>({width:40}));contexts.push(ctx);
    const canvas={width:0,height:0,className:'',remove:vi.fn(),getContext:()=>ctx};canvases.push(canvas);return canvas;
  }});
  const activity:SavedActivity={version:1,id:'synthetic',source:'demo',startedAtMs:1000,endedAtMs:11000,snapshot:{status:'complete',elapsedMs:10000,distanceM:100,speedMps:0,progress:1},samples:[0,1].map((v)=>({lat:0,lng:v*.001,timestampMs:1000+v*10000,activeElapsedMs:v*10000,accuracyM:5,breakBefore:v===0}))};
  const scene=await createStoryScene(activity);scene.drawOverlay(12,['distance','time','pace','date','location']);
  expect(scene.overlay.width).toBe(1440);expect(scene.overlay.height).toBe(1440);
  expect(contexts[2].drawImage).not.toHaveBeenCalled();expect(contexts[2].scale).toHaveBeenCalledWith(2,2);
  expect(contexts[2].fillText).toHaveBeenCalledWith('Distance',expect.any(Number),expect.any(Number));
  expect(contexts[1].clearRect).not.toHaveBeenCalled();
  scene.dispose();for(const canvas of canvases)expect(canvas.remove).toHaveBeenCalledOnce();
});
