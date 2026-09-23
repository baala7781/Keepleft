export type GifWorker=Pick<Worker,'postMessage'|'terminate'|'onmessage'|'onerror'|'onmessageerror'>;

/** Exactly one transferred frame in flight. Compression never runs on the UI thread. */
export async function encodeGif(drawFrame:(index:number)=>Uint8ClampedArray,signal:AbortSignal,progress:(p:number)=>void,
  createWorker:()=>GifWorker=()=>new Worker(new URL('./gif.worker.ts',import.meta.url),{type:'module'})){
  signal.throwIfAborted();const worker=createWorker();
  let rejectPending:((error:unknown)=>void)|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  const failure=()=>rejectPending?.(new Error('GIF encoding stopped. Please retry.'));
  const abort=()=>rejectPending?.(new DOMException('Cancelled','AbortError'));
  worker.onerror=failure;worker.onmessageerror=failure;signal.addEventListener('abort',abort,{once:true});
  const request=(data:object,transfer:Transferable[]=[])=>new Promise<{bytes?:Uint8Array<ArrayBuffer>}>((resolve,reject)=>{
    rejectPending=reject;
    worker.onmessage=event=>{clearTimeout(timer);rejectPending=undefined;event.data.error?reject(new Error(event.data.error)):resolve(event.data);};
    timer=setTimeout(()=>reject(new Error('GIF encoding timed out. Please retry.')),30000);
    try{signal.throwIfAborted();worker.postMessage(data,transfer);}catch(error){reject(error);}
  });
  try{
    for(let index=0;index<180;index++){
      signal.throwIfAborted();const pixels=drawFrame(index);
      await request({kind:'frame',index,rgba:pixels.buffer},[pixels.buffer]);
      signal.throwIfAborted();progress((index+1)/180);
    }
    const result=await request({kind:'finish'});signal.throwIfAborted();
    if(!result.bytes?.length)throw new Error('GIF encoding produced no output.');
    return new Blob([result.bytes],{type:'image/gif'});
  }finally{clearTimeout(timer);rejectPending=undefined;signal.removeEventListener('abort',abort);worker.terminate();}
}
