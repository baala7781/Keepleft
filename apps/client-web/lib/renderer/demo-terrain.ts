import * as THREE from 'three';
import type {MapPlaneFrame} from './map-frame';
import manifest from '../../public/fixtures/madhyamaheshwar/manifest.json';

/** Mapzen Terrarium encodes bare-earth metres, not building or tree heights. */
export function terrariumHeight(red:number,green:number,blue:number) {
  return red*256+green+blue/256-32768;
}

function tilePixel(lng:number,lat:number) {
  const n=2**manifest.terrain.z;
  const x=(lng+180)/360*n-manifest.terrain.x;
  const phi=Math.max(-85,Math.min(85,lat))*Math.PI/180;
  const y=(1-Math.asinh(Math.tan(phi))/Math.PI)/2*n-manifest.terrain.y;
  return {x:x*256,y:y*256};
}

export async function loadDemoTerrain(frame:MapPlaneFrame) {
  const image=new Image();
  image.src='/fixtures/madhyamaheshwar/'+manifest.terrain.tile;
  await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error('Terrain canvas unavailable');
  context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  const sample=(lng:number,lat:number)=>{
    const p=tilePixel(lng,lat),x=Math.max(0,Math.min(canvas.width-1,Math.round(p.x))),y=Math.max(0,Math.min(canvas.height-1,Math.round(p.y)));
    const i=(y*canvas.width+x)*4;
    return terrariumHeight(pixels[i],pixels[i+1],pixels[i+2]);
  };
  const base=sample(manifest.origin.lng,manifest.origin.lat);
  const segments=80,span=2600,stride=segments+1;
  const positions=new Float32Array(stride*stride*3),colors=new Float32Array(positions.length),fade=new Float32Array(stride*stride),indices:number[]=[];
  const stone=new THREE.Color('#656b65'),wood=new THREE.Color('#39443b'),snow=new THREE.Color('#828781');
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++){
    const east=(col/segments*2-1)*span,north=(1-row/segments*2)*span;
    const geo=frame.unproject({x:east,y:north,z:0}),elevation=sample(geo.lng,geo.lat);
    const radius=Math.hypot(east,north),blend=THREE.MathUtils.smoothstep(radius,520,850);
    const height=(elevation-base)*blend;
    const i=(row*stride+col)*3;
    positions.set([east,height-.7,-north],i);
    const color=wood.clone().lerp(stone,THREE.MathUtils.clamp((elevation-base+180)/600,0,.7));
    if(elevation>3800)color.lerp(snow,THREE.MathUtils.clamp((elevation-3800)/500,0,.45));
    colors.set(color.toArray(),i);
    fade[row*stride+col]=THREE.MathUtils.smoothstep(radius,480,700)*(1-THREE.MathUtils.smoothstep(radius,2150,2600));
  }
  for(let row=0;row<segments;row++)for(let col=0;col<segments;col++){
    const a=row*stride+col,b=a+1,c=a+stride,d=c+1;
    // A small flat clearing keeps the mapped trail, runner and buildings visible.
    const mx=(col+.5)/segments*2*span-span,my=span-(row+.5)/segments*2*span;
    if(Math.hypot(mx,my)<480)continue;
    indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('terrainFade',new THREE.BufferAttribute(fade,1));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:'#555c56',vertexColors:true,transparent:true,depthWrite:false,roughness:1,metalness:0,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float terrainFade;\nvarying float vTerrainFade;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainFade = terrainFade;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vTerrainFade;')
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vTerrainFade;');
  };
  const mesh=new THREE.Mesh(geometry,material);
  mesh.receiveShadow=true;
  // Interpolate the rendered triangles, so vegetation touches this exact mesh
  // rather than a different-resolution DEM surface. Below-plane valleys remain
  // covered by the existing base map in this demo backdrop.
  const heightAt=(east:number,north:number)=>{
    if(Math.hypot(east,north)<480||Math.abs(east)>=span||Math.abs(north)>=span)return 0;
    const x=(east/span+1)*segments/2,y=(1-north/span)*segments/2;
    const col=Math.floor(x),row=Math.floor(y),u=x-col,v=y-row,a=row*stride+col;
    const h=(index:number)=>positions[index*3+1];
    const height=u+v<=1?h(a)*(1-u-v)+h(a+1)*u+h(a+stride)*v:
      h(a+stride+1)*(u+v-1)+h(a+1)*(1-v)+h(a+stride)*(1-u);
    return Math.max(0,height);
  };
  return {mesh,heightAt};
}
