import type {BuildingForm} from './buildings';
export type Block={minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number};
export const cameraBlocks=(forms:BuildingForm[]):Block[]=>forms.map(f=>({minX:f.bounds.min.x,maxX:f.bounds.max.x,minZ:-f.bounds.max.y,maxZ:-f.bounds.min.y,minY:Number(f.properties.minHeight)||0,maxY:Number(f.properties.height)||12}));
/** Raise promptly for a wall; require sustained clearance before lowering again.
 * A building edge or noisy position must not rock the camera every other fix. */
export class StableCameraPitch {
  private value=62;
  private clearanceSeconds=0;
  reset(pitch:number){this.value=pitch;this.clearanceSeconds=0;return pitch;}
  update(clear:number,dt:number,reset=false){
    if(reset)return this.reset(clear);
    const seconds=Math.max(0,Math.min(.1,dt));
    if(clear<this.value){this.clearanceSeconds=0;this.value=Math.max(clear,this.value-30*seconds);}
    else if(clear>this.value+2){
      this.clearanceSeconds+=seconds;
      if(this.clearanceSeconds>=1.5)this.value=Math.min(clear,this.value+8*seconds);
    }else this.clearanceSeconds=0;
    return this.value;
  }
}
function intersects(a:number[],b:number[],min:number[],max:number[]){
  let lo=.04,hi=1;
  for(let i=0;i<3;i++){const d=b[i]-a[i];if(Math.abs(d)<1e-8){if(a[i]<min[i]||a[i]>max[i])return false;}else{let t0=(min[i]-a[i])/d,t1=(max[i]-a[i])/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false;}}
  return true;
}
/** Conservative building bounds: find a clear raised view without changing geometry or GPS. */
export function clearCameraPitch(x:number,z:number,bearing:number,distance:number,pitch:number,blocks:Block[]){
  // GPS can lie inside an estimated footprint. No camera pitch can solve that;
  // do not force a permanently vertical view because the target's own box contains it.
  const near=blocks.filter(b=>!(x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&b.minY<2)&&x>=b.minX-distance&&x<=b.maxX+distance&&z>=b.minZ-distance&&z<=b.maxZ+distance);
  const a=[x,1.3,z],rad=bearing*Math.PI/180;
  for(let candidate=pitch;candidate>=0;candidate=Math.max(-1,candidate-8)){
    const p=candidate*Math.PI/180,h=distance*Math.sin(p),eye=[x-Math.sin(rad)*h,1.3+distance*Math.cos(p),z+Math.cos(rad)*h];
    // Clearance around the ray protects the camera shoulder, not just its mathematical center.
    if(!near.some(b=>intersects(a,eye,[b.minX-1.2,b.minY,b.minZ-1.2],[b.maxX+1.2,b.maxY+1.2,b.maxZ+1.2])))return candidate;
  }return 0;
}
