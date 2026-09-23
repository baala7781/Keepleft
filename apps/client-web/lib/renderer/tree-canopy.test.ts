import {it,expect} from 'vitest';
import * as THREE from 'three';
import {treeKinds,treeGeometry,treeAtlas,treeDimensions} from './tree-canopy';
import {treeLOD,createVegetation} from './vegetation';
import {createVegetationPlacement,vegetationKind,pointInPolygon} from './vegetation-placement';
import {createNearbyDetails,qualityBudget} from './details';
import {LocalENU} from '../../../../packages/geo';
import {normalizeOSM} from '../geodata/osm';
import {buildingForms} from './buildings';

const rect=(x:number,y:number,w:number)=>[{lon:x,lat:y},{lon:x+w,lat:y},{lon:x+w,lat:y+w},{lon:x,lat:y+w},{lon:x,lat:y}];
const frame=new LocalENU({lng:0,lat:0});
it('projects far canopy in world metres without singular clip-space radius division',()=>{
  const vegetation=createVegetation([],{type:'FeatureCollection',features:[]},frame);
  const material=vegetation.meshes.find(m=>m.userData.lod==='far')!.material as THREE.Material;
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};
  material.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms,{} as THREE.WebGLRenderer);
  expect(shader.vertexShader).toContain('gl_Position=projectionMatrix*mvPosition');
  expect(shader.vertexShader).toContain('right*position.x');
  expect(shader.vertexShader).not.toContain('/centerClip.w');
  expect(shader.vertexShader).not.toContain('/xClip.w');
  vegetation.dispose();const materials=new Set<THREE.Material>();
  for(const mesh of vegetation.meshes){mesh.geometry.dispose();materials.add(mesh.material as THREE.Material);mesh.dispose();}
  for(const m of materials)m.dispose();
});
it('has four bounded metre-scale silhouettes and a two-triangle far tier',()=>{
  const sizes:string[]=[];
  for(const kind of treeKinds){
    const near=treeGeometry(kind,'near'),mid=treeGeometry(kind,'mid'),far=treeGeometry(kind,'far'),again=treeGeometry(kind,'near');
    expect(near.index!.count/3).toBeLessThanOrEqual(2000);
    expect(mid.index!.count/3).toBeLessThan(240);
    expect(far.index!.count/3).toBe(2);
    expect(near.attributes.position.array).toEqual(again.attributes.position.array);
    expect([...near.attributes.position.array,...near.attributes.normal.array].every(Number.isFinite)).toBe(true);
    expect(near.boundingBox!.min.y).toBeGreaterThan(-.1);
    expect(near.boundingBox!.max.y).toBeLessThan(15);
    expect(near.attributes.color.count).toBe(near.attributes.position.count);
    expect(near.attributes.foliage.count).toBe(near.attributes.position.count);
    sizes.push(near.boundingBox!.getSize(new THREE.Vector3()).toArray().join(','));
    for(const g of [near,mid,far,again])g.dispose();
  }
  expect(new Set(sizes).size).toBe(4);
  expect(treeDimensions('shade').radius).toBeGreaterThan(treeDimensions('columnar').radius*2);
  expect(treeDimensions('columnar').height).toBeGreaterThan(treeDimensions('ornamental').height*2);
});
it('bakes a deterministic small atlas with transparent margins and all four silhouettes',()=>{
  const a=treeAtlas(),b=treeAtlas(),pixels=a.image.data as Uint8Array;
  expect(pixels).toEqual(b.image.data);expect(pixels.byteLength).toBe(256*128*4);
  expect(a.generateMipmaps).toBe(true);expect(a.minFilter).toBe(THREE.LinearMipmapLinearFilter);
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
    let opaque=0,transparent=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){const alpha=pixels[((row*64+y)*256+col*64+x)*4+3];if(alpha)opaque++;else transparent++;}
    expect(opaque).toBeGreaterThan(150);expect(transparent).toBeGreaterThan(100);
  }
  a.dispose();b.dispose();
});
it('resolves canopy semantics without treating every green area as a forest',()=>{
  expect(vegetationKind({kind:'green',natural:'wood'})).toBe('forest');
  expect(vegetationKind({kind:'green',landcover:'trees'})).toBe('forest');
  expect(vegetationKind({kind:'green',leisure:'park'})).toBe('park');
  expect(vegetationKind({kind:'green',leisure:'garden'})).toBe('garden');
  for(const landuse of ['grass','meadow','farmland','residential'])expect(vegetationKind({kind:'green',landuse})).toBeUndefined();
  expect(vegetationKind({kind:'green',leisure:'pitch'})).toBeUndefined();
});
it('produces stable, varied placement and denser woodland than a park',()=>{
  const make=(tags:Record<string,string>)=>{
    const data=normalizeOSM({elements:[{type:'way',id:1,tags,geometry:rect(-.002,-.002,.004)}]});
    return createVegetationPlacement([],data,frame);
  };
  const park=make({leisure:'park'}),wood=make({natural:'wood'});
  const a=park.sample(0,0,600,3600);
  expect(a).toEqual(park.sample(0,0,600,3600));
  expect(new Set(a.map(t=>t.kind)).size).toBe(4);
  const forest=wood.sample(0,0,600,3600);
  const cover=(trees:typeof a)=>{
    let covered=0,total=0;
    for(let x=-180;x<=180;x+=12)for(let y=-180;y<=180;y+=12){
      total++;if(trees.some(t=>Math.hypot(x-t.x,y-t.y)<treeDimensions(t.kind).radius*t.scale))covered++;
    }
    return covered/total;
  };
  expect(cover(forest)).toBeGreaterThan(.65);
  expect(cover(forest)).toBeGreaterThan(cover(a)*1.2);
  expect(a.every(t=>t.scale>=1.35&&t.scale<1.8)).toBe(true);
  expect(park.sample(0,0,600,10)).toHaveLength(10);
});
it('excludes water, building canopies, roads and mapped open clearings',()=>{
  const data=normalizeOSM({elements:[
    {type:'way',id:1,tags:{leisure:'park'},geometry:rect(-.002,-.002,.004)},
    {type:'way',id:2,tags:{building:'yes'},geometry:rect(0,0,.0004)},
    {type:'way',id:3,tags:{natural:'water'},geometry:rect(-.001,-.001,.0004)},
    {type:'way',id:4,tags:{highway:'residential'},geometry:[{lon:-.002,lat:0},{lon:.002,lat:0}]},
    {type:'way',id:5,tags:{landuse:'grass'},geometry:rect(.001,.001,.0005)},
  ]});
  const forms=buildingForms(data,frame),trees=createVegetationPlacement(forms,data,frame).sample(0,0,600,1800);
  expect(trees.length).toBeGreaterThan(100);
  for(const t of trees){
    const radius=treeDimensions(t.kind).radius*t.scale;
    expect(Math.abs(t.y)).toBeGreaterThanOrEqual(5+radius*.55);
    expect(forms[0].bounds.distanceToPoint(new THREE.Vector2(t.x,t.y))).toBeGreaterThanOrEqual(radius+.5);
    for(const f of data.features.filter(f=>f.properties.kind==='water'||f.properties.landuse==='grass')){
      const rings=(f.geometry.coordinates as number[][][]).map(r=>r.map(([lng,lat])=>{const p=frame.project({lng,lat});return [p.x,p.y];}));
      expect(pointInPolygon(t.x,t.y,rings)).toBe(false);
    }
  }
});
it('plants roadside trees only with explicit tree-lined evidence, preserving the side and bridge exclusion',()=>{
  const sample=(extra:Record<string,string>)=>{
    const data=normalizeOSM({elements:[{type:'way',id:1,tags:{highway:'residential',...extra},geometry:[{lon:-.002,lat:0},{lon:.002,lat:0}]}]});
    return createVegetationPlacement([],data,frame).sample(0,0,600,1800);
  };
  expect(sample({})).toEqual([]);
  const left=sample({tree_lined:'left'});expect(left.length).toBeGreaterThan(10);expect(left.every(t=>t.y>0)).toBe(true);
  expect(sample({tree_lined:'yes',bridge:'yes'})).toEqual([]);
  expect(sample({tree_lined:'yes',tunnel:'yes'})).toEqual([]);
});
it('adds hysteresis at LOD boundaries',()=>{
  expect(treeLOD(12)).toBe('far');expect(treeLOD(13)).toBe('mid');
  expect(treeLOD(11,'mid')).toBe('mid');expect(treeLOD(9,'mid')).toBe('far');
  expect(treeLOD(40,'mid')).toBe('mid');expect(treeLOD(44,'mid')).toBe('near');
  expect(treeLOD(40,'near')).toBe('near');expect(treeLOD(35,'near')).toBe('mid');
});
it('does not evict existing crowns merely because the camera moves',()=>{
  const data=normalizeOSM({elements:[{type:'way',id:1,tags:{natural:'wood'},geometry:rect(-.002,-.002,.004)}]});
  const placement=createVegetationPlacement([],data,frame);
  const first=placement.sample(0,0,1000,12000),moved=placement.sample(120,40,1000,12000);
  expect(first.map(t=>t.key).sort()).toEqual(moved.map(t=>t.key).sort());
});
it('retains visible tree instances while a replacement neighborhood is preparing',()=>{
  const data=normalizeOSM({elements:[{type:'way',id:1,tags:{natural:'wood'},geometry:rect(-.002,-.002,.004)}]});
  const old=createNearbyDetails([],data,frame);old.update(0,0,18,'balanced');
  const next=createNearbyDetails([],data,frame);next.inherit(old);
  expect(next.getStats().trees).toBe(old.getStats().trees);expect(next.getStats().trees).toBeGreaterThan(0);
  for(let i=0;i<old.vegetation.meshes.length;i++){
    const a=old.vegetation.meshes[i],b=next.vegetation.meshes[i];expect(b.count).toBe(a.count);
    expect(b.instanceMatrix.array.slice(0,b.count*16)).toEqual(a.instanceMatrix.array.slice(0,a.count*16));
  }
  old.dispose();next.dispose();
});
it('spreads a limited aerial budget across woodland instead of cutting a circle around the camera',()=>{
  const data=normalizeOSM({elements:[{type:'way',id:1,tags:{natural:'wood'},geometry:rect(-.008,-.008,.016)}]});
  const placement=createVegetationPlacement([],data,frame),trees=placement.sample(0,0,1000,500);
  expect(trees).toHaveLength(500);expect(trees).toEqual(placement.sample(0,0,1000,500));
  expect(trees.filter(t=>t.distance>750).length).toBeGreaterThan(50);
  expect(trees.some(t=>t.distance>750&&(t.canopySpread||1)>1)).toBe(true);
  expect(trees.every(t=>t.distance>=250||(t.canopySpread||1)===1)).toBe(true);
  for(const sx of [-1,1])for(const sy of [-1,1])expect(trees.some(t=>t.x*sx>400&&t.y*sy>400)).toBe(true);
});
it('reuses pooled buffers, caps close detail and disposes the generated atlas',()=>{
  const data=normalizeOSM({elements:[{type:'way',id:1,tags:{natural:'wood'},geometry:rect(-.006,-.006,.012)}]});
  const details=createNearbyDetails([],data,frame),meshes=details.group.children as THREE.InstancedMesh[],ids=meshes.map(m=>m.geometry.uuid);
  const started=performance.now();details.update(0,0,15,'balanced');
  const placementMs=performance.now()-started;
  expect(details.getStats().treeLods.near).toBe(0);expect(details.getStats().treeLods.mid).toBeLessThanOrEqual(420);
  expect(details.getStats().treeLods.far).toBeGreaterThan(0);
  expect(details.getStats().trees).toBeLessThanOrEqual(qualityBudget.balanced.trees);
  const population=details.getStats().trees;
  details.setElevation(()=>37);details.update(0,0,15,'balanced');
  const placed=meshes.find(m=>m.userData.vegetation&&m.count>0)!,matrix=new THREE.Matrix4();
  placed.getMatrixAt(0,matrix);expect(matrix.elements[13]).toBe(37);
  expect(details.getStats().trees).toBe(population);
  for(const zoom of [15.8,16,16.2,17,16,15.5]){details.update(0,0,zoom,'balanced');expect(details.getStats().trees).toBe(population);}
  details.update(0,0,21,'balanced');
  expect(details.getStats().treeLods.near).toBeGreaterThan(0);expect(details.getStats().treeLods.near).toBeLessThanOrEqual(72);
  expect(details.getStats().treeLods.mid).toBeLessThanOrEqual(420);
  expect(details.update(0,0,21,'balanced')).toBe(false);
  details.update(100,20,18,'high');expect(meshes.map(m=>m.geometry.uuid)).toEqual(ids);
  const bytes=()=>meshes.reduce((total,m)=>total+m.instanceMatrix.array.byteLength+(m.instanceColor?.array.byteLength||0)+
    Object.values(m.geometry.attributes).reduce((sum,a)=>sum+(a as THREE.BufferAttribute).array.byteLength,0)+(m.geometry.index?.array.byteLength||0),0);
  const allocated=bytes();expect(allocated).toBeLessThan(16*1024*1024);
  for(const x of [200,400,200,0])details.update(x,20,18,'high');
  expect(bytes()).toBe(allocated);expect(meshes.every(m=>m.count<=m.instanceMatrix.count)).toBe(true);
  console.info('vegetation budget',{population,placementMs:Math.round(placementMs),bufferMB:Number((allocated/1048576).toFixed(2))});
  details.update(0,0,18,'battery');expect(meshes.every(m=>m.count===0)).toBe(true);
  const far=meshes.find(m=>m.userData.lod==='far')!;
  const texture=(far.material as THREE.MeshStandardMaterial).map!;
  let disposed=0;texture.addEventListener('dispose',()=>disposed++);details.dispose();expect(disposed).toBe(1);
  const materials=new Set<THREE.Material>();
  meshes.forEach(m=>{m.geometry.dispose();materials.add(m.material as THREE.Material);m.dispose();});materials.forEach(m=>m.dispose());
});
