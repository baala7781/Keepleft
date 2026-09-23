import {createStoryScene} from '../lib/story/scene';
import {exportSticker} from '../lib/story/sticker-export';
import {initialSnapshot} from '../lib/tracking/activity';
import type {SavedActivity} from '../lib/tracking/storage';
const samples=Array.from({length:100},(_,i)=>({lng:i*.00001,lat:Math.sin(i/20)*.0001,timestampMs:1000+i*1000,activeElapsedMs:i*1000,accuracyM:4,breakBefore:i===0}));
const activity:SavedActivity={version:1,id:'synthetic-export',source:'gps',activityType:'run',startedAtMs:1000,endedAtMs:100000,samples,snapshot:{...initialSnapshot,status:'complete',distanceM:100,elapsedMs:99000}};
let controller:AbortController|undefined,url='',last=0,worst=0;
const tick=(now:number)=>{if(controller&&last)worst=Math.max(worst,now-last);last=now;requestAnimationFrame(tick);};requestAnimationFrame(tick);
document.querySelector('#cancel')!.addEventListener('click',()=>controller?.abort());
document.querySelector('#start')!.addEventListener('click',async()=>{
  if(controller)return;controller=new AbortController();worst=0;const start=performance.now();
  const scene=await createStoryScene(activity),result=document.querySelector('#result')!;result.textContent='Encoding';
  try{
    const value=await exportSticker(scene,controller.signal,p=>{(document.querySelector('#progress') as HTMLProgressElement).value=p;});
    const header=new TextDecoder().decode((await value.blob!.arrayBuffer()).slice(0,6));
    if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(value.blob!);(document.querySelector('#preview') as HTMLImageElement).src=url;
    result.textContent=JSON.stringify({header,bytes:value.blob!.size,milliseconds:Math.round(performance.now()-start),worstFrameMs:worst},null,2);
  }catch(error){result.textContent=error instanceof Error?error.message:String(error);}
  finally{scene.dispose();controller=undefined;}
});
