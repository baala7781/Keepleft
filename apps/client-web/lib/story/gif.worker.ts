import {GIFEncoder} from 'gifenc';
import {stickerIndices,stickerPalette} from './gif-palette';

const encoder=GIFEncoder();let frames=0,finished=false;
self.onmessage=({data}:{data:{kind:'frame'|'finish';index?:number;rgba?:ArrayBuffer}})=>{
  try{
    if(finished)throw new Error();
    if(data.kind==='frame'){
      if(data.index!==frames||frames>=180||data.rgba?.byteLength!==480*480*4)throw new Error();
      const pixels=stickerIndices(new Uint8ClampedArray(data.rgba));
      encoder.writeFrame(pixels,480,480,{palette:frames===0?stickerPalette:undefined,transparent:true,transparentIndex:0,dispose:2,repeat:0,delay:(Math.round((frames+1)*100/15)-Math.round(frames*100/15))*10});
      frames++;self.postMessage({});
    }else{
      if(frames!==180)throw new Error();encoder.finish();finished=true;
      const bytes=encoder.bytes().slice();self.postMessage({bytes},{transfer:[bytes.buffer]});
    }
  }catch{finished=true;self.postMessage({error:'Could not encode the GIF. Please retry.'});}
};
