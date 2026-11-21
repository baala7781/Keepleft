import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {treeDimensions,treeKinds,type TreeKind,type TreeLOD} from './tree-canopy';

/** Blender library object per existing placement archetype (see assets/manifest.json). */
export const treeAssetNames:Record<TreeKind,string>={
  broadleaf:'YL_Tree_Round_A',shade:'YL_Tree_Broad_A',columnar:'YL_Tree_Conifer_A',ornamental:'YL_Tree_Ornamental_A',
};
export const treeAssetUrl='/models/world/trees.glb';
export type TreeAssets=Map<`${TreeKind}/${Exclude<TreeLOD,'far'>}`,THREE.BufferGeometry>;

/**
 * Flatten one glTF tree (foliage and bark primitives) into the vegetation batch layout:
 * position, normal, linear RGB `color` and a `foliage` mask. `height` rescales to the
 * archetype's metre height so placement spacing and far cards stay consistent.
 */
export function treeAssetGeometry(object:THREE.Object3D,height:number){
  const merged=flatten(object,true);
  merged.computeBoundingBox();
  const box=merged.boundingBox!,scale=height/Math.max(.01,box.max.y-box.min.y);
  merged.translate(0,-box.min.y,0).scale(scale,scale,scale);
  merged.computeBoundingBox();merged.computeBoundingSphere();
  return merged;
}
/** Merge an object's glTF primitives into one indexed geometry in the object's own space. */
function flatten(object:THREE.Object3D,foliageMask:boolean){
  const parts:THREE.BufferGeometry[]=[];
  object.updateWorldMatrix(true,true);
  const root=object.matrixWorld.clone().invert();
  object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    const source=child.geometry as THREE.BufferGeometry,position=source.getAttribute('position'),color=source.getAttribute('color');
    const bark=/bark/i.test((child.material as THREE.Material).name);
    const g=new THREE.BufferGeometry(),count=position.count,rgb=new Float32Array(count*3);
    g.setAttribute('position',position.clone());
    if(source.getAttribute('normal'))g.setAttribute('normal',source.getAttribute('normal').clone());
    for(let i=0;i<count;i++){rgb[i*3]=color?color.getX(i):1;rgb[i*3+1]=color?color.getY(i):1;rgb[i*3+2]=color?color.getZ(i):1;}
    g.setAttribute('color',new THREE.BufferAttribute(rgb,3));
    if(foliageMask)g.setAttribute('foliage',new THREE.BufferAttribute(new Float32Array(count).fill(bark?0:1),1));
    if(source.index)g.setIndex(source.index.clone());else g.setIndex([...Array(count).keys()]);
    g.applyMatrix4(root.clone().multiply(child.matrixWorld));
    if(!g.getAttribute('normal'))g.computeVertexNormals();
    parts.push(g);
  });
  if(!parts.length)throw new Error(`Tree asset ${object.name} has no meshes`);
  const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  if(!merged)throw new Error(`Asset ${object.name} has mismatched primitives`);
  return merged;
}

/** Build near/mid geometries for every archetype. LOD1 shares LOD0's scale so swaps never resize. */
export function treeAssetsFrom(scene:THREE.Object3D):TreeAssets{
  const assets:TreeAssets=new Map();
  for(const kind of treeKinds){
    const name=treeAssetNames[kind],near=scene.getObjectByName(`${name}_LOD0`),mid=scene.getObjectByName(`${name}_LOD1`);
    if(!near||!mid)continue;
    const nearGeometry=treeAssetGeometry(near,treeDimensions(kind).height),authored=new THREE.Box3().setFromObject(near);
    const scale=treeDimensions(kind).height/Math.max(.01,authored.max.y-authored.min.y);
    assets.set(`${kind}/near`,nearGeometry);
    assets.set(`${kind}/mid`,treeAssetGeometry(mid,(new THREE.Box3().setFromObject(mid).max.y-authored.min.y)*scale));
  }
  return assets;
}

/** Facade modules keep authored metre scale; they are placed per bay, never fitted to a footprint. */
export type FacadeAssets={frame:THREE.BufferGeometry;balcony:THREE.BufferGeometry};
export const facadeAssetUrl='/models/world/facades.glb';
function moduleGeometry(object:THREE.Object3D){
  const g=flatten(object,false);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function facadeAssetsFrom(scene:THREE.Object3D):FacadeAssets|undefined{
  const frame=scene.getObjectByName('YL_WindowFrame_A'),balcony=scene.getObjectByName('YL_Balcony_A');
  return frame&&balcony?{frame:moduleGeometry(frame),balcony:moduleGeometry(balcony)}:undefined;
}
let facades:Promise<FacadeAssets|undefined>|undefined;
export function loadFacadeAssets(url=facadeAssetUrl){
  facades??=new GLTFLoader().loadAsync(url).then(gltf=>facadeAssetsFrom(gltf.scene)).catch(error=>{facades=undefined;throw error;});
  return facades;
}

let pending:Promise<TreeAssets>|undefined;
/** One shared download and parse per session; failures clear the cache so a later world can retry. */
export function loadTreeAssets(url=treeAssetUrl){
  pending??=new GLTFLoader().loadAsync(url).then(gltf=>treeAssetsFrom(gltf.scene)).catch(error=>{pending=undefined;throw error;});
  return pending;
}
