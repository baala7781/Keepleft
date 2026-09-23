import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
let source:Promise<GLTF>|undefined;
export type Athlete={group:THREE.Group;setPose:(seconds:number,speed:number,moving:boolean)=>void;dispose:()=>void};
export async function loadAthlete():Promise<Athlete>{
  source??=new GLTFLoader().loadAsync('/models/keepleft-athlete.glb').catch(error=>{source=undefined;throw error;});
  const asset=await source,model=clone(asset.scene),group=new THREE.Group();group.add(model);
  const mixer=new THREE.AnimationMixer(model),actions=['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop'].map(name=>mixer.clipAction(asset.animations.find(a=>a.name===name)!).play());
  // The authored body is approximately 1.82 m; normalize once, preserving bone proportions.
  const bounds=new THREE.Box3().setFromObject(model),scale=1.8/(bounds.max.y-bounds.min.y);model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;}});
  let disposed=false;
  function setPose(seconds:number,speed:number,moving:boolean){
    if(disposed)return;const v=moving?Math.max(0,speed):0;
    const jog=THREE.MathUtils.smoothstep(v,1.5,2.5),sprint=THREE.MathUtils.smoothstep(v,3.7,5.3),walk=THREE.MathUtils.smoothstep(v,.1,.7);
    const weights=[1-walk,walk*(1-jog),jog*(1-sprint),sprint];
    actions.forEach((a,i)=>{a.enabled=true;a.setEffectiveWeight(weights[i]);a.time=((seconds*(i===0?1:Math.max(.65,Math.min(1.4,v/[1,1.35,2.8,5][i]))))%a.getClip().duration+a.getClip().duration)%a.getClip().duration;});
    mixer.update(0);model.updateMatrixWorld(true);
  }
  setPose(0,0,false);
  return {group,setPose,dispose(){disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});group.clear();}};
}
