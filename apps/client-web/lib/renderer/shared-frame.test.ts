import {expect,it} from 'vitest';
import type * as THREE from 'three';
import {renderSharedFrame} from './shared-frame';

it('restores the current drawing-buffer viewport even on shadow-update frames after resizing',()=>{
  const gl={drawingBufferWidth:1280,drawingBufferHeight:720};
  let cached=[1280,720],actual=[1280,720],shadow=false;
  const renderer={
    resetState:()=>{actual=[gl.drawingBufferWidth,gl.drawingBufferHeight];},
    setViewport:(_x:number,_y:number,w:number,h:number)=>{cached=[w,h];actual=[w,h];},
    render:()=>{if(shadow)actual=[...cached];},
  } as unknown as THREE.WebGLRenderer;
  for(const [w,h] of [[1280,720],[590,1277],[1179,2553],[1600,900]]){
    gl.drawingBufferWidth=w;gl.drawingBufferHeight=h;
    for(shadow of [false,true,false,true]){
      renderSharedFrame(renderer,{} as THREE.Scene,{} as THREE.Camera,gl as WebGLRenderingContext);
      expect(actual).toEqual([w,h]);
    }
  }
});
