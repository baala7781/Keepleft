import type * as THREE from 'three';

/** MapLibre owns canvas size. Sync Three's cached viewport as well as GL state:
 * a shadow pass restores that cache, not the viewport set by resetState(). */
export function renderSharedFrame(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera,gl:WebGLRenderingContext|WebGL2RenderingContext){
  renderer.resetState();
  renderer.setViewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
  renderer.render(scene,camera);
}
