import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {treeDimensions,treeKinds} from './tree-canopy';
import {facadeAssetsFrom,treeAssetNames,treeAssetsFrom} from './world-assets';

const glb=readFileSync(fileURLToPath(new URL('../../public/models/world/trees.glb',import.meta.url)));
const parse=()=>new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'');

describe('Blender tree library',()=>{
  it('ships near and mid meshes for every placement archetype',async()=>{
    const {scene}=await parse();
    for(const kind of treeKinds)for(const lod of [0,1])expect(scene.getObjectByName(`${treeAssetNames[kind]}_LOD${lod}`),`${kind} LOD${lod}`).toBeTruthy();
  });
  it('converts each tree to the vegetation batch layout at archetype scale and budget',async()=>{
    const assets=treeAssetsFrom((await parse()).scene);
    expect(assets.size).toBe(treeKinds.length*2);
    for(const kind of treeKinds){
      const near=assets.get(`${kind}/near`)!,mid=assets.get(`${kind}/mid`)!;
      for(const g of [near,mid]){
        const count=g.attributes.position.count;
        expect(g.attributes.normal.count).toBe(count);
        expect(g.attributes.color.count).toBe(count);
        expect(g.attributes.foliage.count).toBe(count);
        expect([...g.attributes.position.array,...g.attributes.color.array].every(Number.isFinite)).toBe(true);
        // Trunks stand on the ground and colours stay multipliers of the theme canopy tint.
        expect(g.boundingBox!.min.y).toBeCloseTo(0,3);
        expect(Math.max(...g.attributes.color.array)).toBeLessThanOrEqual(1.0001);
        // Baked light and shade must survive export; an all-white fallback means COLOR_0 was lost.
        expect(new Set(g.attributes.color.array).size).toBeGreaterThan(8);
        const foliage=[...(g.attributes.foliage.array as Float32Array)];
        expect(foliage.some(v=>v===1)).toBe(true);
      }
      expect(near.boundingBox!.max.y).toBeCloseTo(treeDimensions(kind).height,2);
      // Mid tier never grows past the near silhouette, so LOD swaps cannot pop upward.
      expect(mid.boundingBox!.max.y).toBeLessThanOrEqual(near.boundingBox!.max.y+1e-3);
      expect(near.index!.count/3).toBeLessThanOrEqual(2000);
      expect(mid.index!.count/3).toBeLessThan(240);
      expect(mid.index!.count).toBeLessThan(near.index!.count);
    }
    for(const g of assets.values())g.dispose();
  });
  it('ships facade modules at authored scale, projecting outward from the wall plane',async()=>{
    const file=readFileSync(fileURLToPath(new URL('../../public/models/world/facades.glb',import.meta.url)));
    const {scene}=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
    const facades=facadeAssetsFrom(scene)!;expect(facades).toBeTruthy();
    const frame=facades.frame.boundingBox!,balcony=facades.balcony.boundingBox!;
    // The frame wraps a 1 m opening centred on the origin; the app scales it to each window size.
    expect(frame.min.x).toBeCloseTo(-.69,2);expect(frame.max.x).toBeCloseTo(.69,2);
    expect(frame.max.y).toBeCloseTo(.59,2);
    // Local +Z is the wall's outward normal; nothing may sink into the wall.
    expect(frame.min.z).toBeGreaterThanOrEqual(-1e-4);expect(frame.max.z).toBeGreaterThan(.1);
    expect(balcony.min.z).toBeGreaterThanOrEqual(-1e-4);expect(balcony.max.z).toBeCloseTo(.95,2);
    expect(balcony.max.x-balcony.min.x).toBeCloseTo(1.8,2);expect(balcony.min.y).toBeCloseTo(-.16,2);
    for(const g of [facades.frame,facades.balcony]){
      expect(g.attributes.color.count).toBe(g.attributes.position.count);
      expect(g.index!.count/3).toBeLessThan(160);
    }
  });
  it('is deterministic across loads',async()=>{
    const a=treeAssetsFrom((await parse()).scene),b=treeAssetsFrom((await parse()).scene);
    for(const [key,g] of a)expect(g.attributes.position.array).toEqual(b.get(key)!.attributes.position.array);
    expect(new THREE.Box3().setFromBufferAttribute(a.get('shade/near')!.attributes.position as THREE.BufferAttribute).getSize(new THREE.Vector3()).x)
      .toBeGreaterThan(new THREE.Box3().setFromBufferAttribute(a.get('columnar/near')!.attributes.position as THREE.BufferAttribute).getSize(new THREE.Vector3()).x);
  });
});
