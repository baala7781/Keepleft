import {expect,it,vi} from 'vitest';
import {encodeGif,type GifWorker} from './gif-encoding';
function fixture(){
  const messages:{kind:string;index?:number}[]=[];let active=0,maxActive=0;
  const worker:GifWorker={onmessage:null,onerror:null,onmessageerror:null,terminate:vi.fn(),postMessage:vi.fn((data)=>{
    messages.push(data);active++;maxActive=Math.max(active,maxActive);
    queueMicrotask(()=>{active--;worker.onmessage?.call(worker as Worker,{data:data.kind==='finish'?{bytes:new Uint8Array([71,73,70])}:{}} as MessageEvent);});
  })};
  return {worker,messages,max:()=>maxActive};
}
it('encodes sequential transferred frames without queuing bitmap memory',async()=>{
  const f=fixture(),progress=vi.fn(),draw=vi.fn(()=>new Uint8ClampedArray(4));
  const blob=await encodeGif(draw,new AbortController().signal,progress,()=>f.worker);
  expect(f.max()).toBe(1);expect(f.messages).toHaveLength(181);
  expect(f.messages.slice(0,180).map(m=>m.index)).toEqual(Array.from({length:180},(_,i)=>i));
  expect(blob.type).toBe('image/gif');expect(blob.size).toBe(3);
  expect(progress).toHaveBeenLastCalledWith(1);expect(f.worker.terminate).toHaveBeenCalledOnce();
});
it('cancels an in-flight encode and terminates its worker',async()=>{
  const f=fixture(),controller=new AbortController();f.worker.postMessage=vi.fn();
  const result=encodeGif(()=>new Uint8ClampedArray(4),controller.signal,()=>{},()=>f.worker);
  controller.abort();await expect(result).rejects.toMatchObject({name:'AbortError'});
  expect(f.worker.terminate).toHaveBeenCalledOnce();
});
it('does not create a worker after cancellation and cleans up startup failures',async()=>{
  const controller=new AbortController();controller.abort();const create=vi.fn();
  await expect(encodeGif(()=>new Uint8ClampedArray(4),controller.signal,()=>{},create)).rejects.toThrow();expect(create).not.toHaveBeenCalled();
  const f=fixture();f.worker.postMessage=()=>{throw new Error('unavailable');};
  await expect(encodeGif(()=>new Uint8ClampedArray(4),new AbortController().signal,()=>{},()=>f.worker)).rejects.toThrow('unavailable');
  expect(f.worker.terminate).toHaveBeenCalledOnce();
});
it('reports worker failures without silently doing compression on the main thread',async()=>{
  const f=fixture();f.worker.postMessage=()=>queueMicrotask(()=>f.worker.onerror?.call(f.worker as Worker,{} as ErrorEvent));
  await expect(encodeGif(()=>new Uint8ClampedArray(4),new AbortController().signal,()=>{},()=>f.worker)).rejects.toThrow('stopped');
  expect(f.worker.terminate).toHaveBeenCalledOnce();
});
