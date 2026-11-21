import type * as THREE from 'three';

/** Optional presentation stage for showcases. 1 = the normal world; absent = untouched. */
export type WorldAssembly={buildings:number;trees:number;water:number};
type Parts={buildings:THREE.Object3D;details:THREE.Object3D;vegetation:readonly THREE.Object3D[];water:THREE.Object3D};

const unit=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:1));

/**
 * Grows buildings and trees from the ground plane. Geographic footprints and
 * positions are never altered: only the vertical scale of whole groups changes,
 * so facade details scale with the buildings they belong to.
 * Returns true when anything changed (shadows need a refresh).
 */
export function applyAssembly(stage:WorldAssembly,parts:Parts){
  const b=unit(stage.buildings),t=unit(stage.trees),w=unit(stage.water);
  let changed=false;
  const set=(o:THREE.Object3D,scaleY:number,visible?:boolean)=>{
    if(o.scale.y!==scaleY){o.scale.y=scaleY;changed=true;}
    if(visible!==undefined&&o.visible!==visible){o.visible=visible;changed=true;}
  };
  set(parts.buildings,Math.max(b,1e-4),b>1e-3);
  const vegetation=new Set(parts.vegetation);
  for(const child of parts.details.children){
    if(vegetation.has(child))set(child,Math.max(t,1e-4),t>1e-3);
    else set(child,Math.max(b,1e-4));
  }
  set(parts.water,1,w>.02);
  return changed;
}
