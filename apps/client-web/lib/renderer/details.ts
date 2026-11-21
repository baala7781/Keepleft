import * as THREE from 'three';
import type {BuildingForm} from './buildings';
import type {WorldData} from '../geodata/osm';
import type {LocalFrame} from '../../../../packages/geo';
import {createVegetation,type VegetationStats} from './vegetation';
import {noir} from './noir-palette';
import {worldThemes,type WorldTheme} from './world-theme';
import {buildingProfile} from './building-profile';
import type {WorldWork} from './background-work';
import {loadFacadeAssets} from './world-assets';
import {roadProfile,roadTier} from '../geodata/roads';
import {pointInPolygon} from './vegetation-placement';
export {pointInPolygon};

import {qualityBudget,type Quality} from './quality-budget';
export {qualityBudget,type Quality} from './quality-budget';
export type DetailStats={windows:number;trees:number;lamps:number;detailed:boolean;treeLods:VegetationStats};
/** Geographic building detail and semantic vegetation share a lifecycle, not capture state. */
export function createNearbyDetails(forms:BuildingForm[],data:WorldData,frame:LocalFrame,work?:WorldWork,wake=()=>{}){
  const group=new THREE.Group(),windowGeometry=new THREE.PlaneGeometry(1,1);
  const windows=new THREE.InstancedMesh(windowGeometry,new THREE.MeshBasicMaterial({color:noir.window,side:THREE.DoubleSide}),4200);
  windows.count=0;windows.frustumCulled=false;windows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(windows);
  // Night street lamps: a dark pole standing on the sidewalk, a small warm head, and an additive
  // pool of light on the ground. No real lights, so cost stays at three instanced draws.
  const LAMP_CAP=700,POLE=4.2;
  const poleGeometry=new THREE.CylinderGeometry(.06,.09,POLE,5).translate(0,POLE/2,0);
  const headGeometry=new THREE.SphereGeometry(.24,8,6).translate(0,POLE,0);
  const glowGeometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const glowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
    uniforms:{color:{value:new THREE.Color('#ffb35a')},strength:{value:.6}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 color;uniform float strength;varying vec2 vUv;void main(){float d=clamp(length(vUv-0.5)*2.0,0.0,1.0);float a=pow(1.0-d,1.3)*strength;gl_FragColor=vec4(color*a,a);}'});
  const lampMeshes=[new THREE.InstancedMesh(poleGeometry,new THREE.MeshStandardMaterial({color:'#2b2d2f',roughness:.8}),LAMP_CAP),
    new THREE.InstancedMesh(headGeometry,new THREE.MeshBasicMaterial({color:'#ffd58a',toneMapped:false}),LAMP_CAP),
    new THREE.InstancedMesh(glowGeometry,glowMaterial,LAMP_CAP)];
  const [poles,heads,glows]=lampMeshes;
  for(const [mesh,name] of [[poles,'lamp-poles'],[heads,'lamp-heads'],[glows,'lamp-glow']] as const){mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.visible=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);}
  glows.renderOrder=2;
  let elevation:(x:number,y:number)=>number=()=>0,night=false;
  const vegetation=createVegetation(forms,data,frame,work,wake);group.add(...vegetation.meshes);
  let lamps=lampSites(data,frame,forms);
  // Blender facade modules ride on the same per-bay layout as windows, so they follow every real
  // wall edge and are never stretched to a footprint. Caps keep the nearest bays detailed only.
  const frameCap={battery:0,balanced:900,high:2400},balconyCap={battery:0,balanced:240,high:600};
  const facadeMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95});
  const placeholder=()=>new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([],3));
  const frames=new THREE.InstancedMesh(placeholder(),facadeMaterial,frameCap.high),balconies=new THREE.InstancedMesh(placeholder(),facadeMaterial,balconyCap.high);
  for(const [mesh,name] of [[frames,'facade-frames'],[balconies,'facade-balconies']] as const){
    mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.receiveShadow=true;group.add(mesh);
  }
  balconies.castShadow=true; // Frames are too thin to need shadow casting.
  // A light ledge at every floor line of nearby buildings: one instanced box per wall edge and floor.
  const ledgeCap={battery:0,balanced:1500,high:3000};
  const ledgeMaterial=new THREE.MeshStandardMaterial({color:'#f2eee6',roughness:.9});
  const ledges=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),ledgeMaterial,ledgeCap.high);
  ledges.name='facade-ledges';ledges.count=0;ledges.frustumCulled=false;ledges.receiveShadow=true;ledges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(ledges);
  let facadesReady=false,disposed=false;
  if(typeof window!=='undefined')loadFacadeAssets().then(assets=>{
    if(!assets||disposed)return;
    frames.geometry.dispose();frames.geometry=assets.frame.clone();balconies.geometry.dispose();balconies.geometry=assets.balcony.clone();
    facadesReady=true;lastQuality=undefined;wake();
  }).catch(()=>{/* Flat windows remain when the module library cannot load. */});
  const transform=new THREE.Object3D(),center=new THREE.Vector2(),last=new THREE.Vector2(Infinity,Infinity),shade=new THREE.Color();
  let lastQuality:Quality|undefined,lastDetailed=false;
  const update=(x:number,y:number,zoom:number,quality:Quality)=>{
    const changed=vegetation.update(x,y,zoom,quality),detailed=zoom>=16;center.set(x,y);
    if(lastQuality===quality&&lastDetailed===detailed&&last.distanceTo(center)<40)return changed;
    last.copy(center);lastQuality=quality;lastDetailed=detailed;
    const budget=qualityBudget[quality];let wc=0,fc=0,bc=0,lgc=0;
    const maxFrames=facadesReady?frameCap[quality]:0,maxBalconies=facadesReady?balconyCap[quality]:0;
    const nearby=detailed&&budget.windows?forms.filter(f=>f.bounds.distanceToPoint(center)<budget.radius).sort((a,b)=>a.bounds.distanceToPoint(center)-b.bounds.distanceToPoint(center)):[];
    outer:for(const form of nearby){
      const style=buildingProfile(form.properties);
      const height=Number(form.properties.height)||12,min=Number(form.properties.minHeight)||0,eave=height-(form.properties.roofShape==='flat'?0:Number(form.properties.roofHeight)||0);
      for(const ring of form.polygon){
        let area=0;for(let i=1;i<ring.length;i++)area+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];
        for(let i=1;i<ring.length;i++){
          const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<2.5)continue;
          const sign=area>0?1:-1,nx=dy/length*sign,nz=dx/length*sign,columns=Math.min(25,Math.floor(length/Math.max(style.bay,budget.spacing)));
          for(let h=min+style.floor;h<eave-.4&&lgc<ledgeCap[quality];h+=style.floor){
            transform.position.set(a[0]+dx/2+nx*.1,h,-(a[1]+dy/2)+nz*.1);transform.rotation.set(0,Math.atan2(nx,nz),0);transform.scale.set(length+.2,.16,.22);transform.updateMatrix();ledges.setMatrixAt(lgc++,transform.matrix);
          }
          // Offices and shops read as continuous glass bands; homes keep separate windows.
          const band=style.kind==='office'||style.kind==='commercial',windowWidth=band?Math.min(length/Math.max(1,columns)*.88,6):style.window[0];
          for(let h=min+style.floor*.56;h<eave-.65;h+=style.floor)for(let col=0;col<columns;col++){
            if(wc>=budget.windows)break outer;
            const lit=(col+Math.floor(h)*7+i*3)%5===0;
            const t=(col+.5)/columns;transform.position.set(a[0]+dx*t+nx*.045,h,-(a[1]+dy*t)+nz*.045);transform.rotation.set(0,Math.atan2(nx,nz),0);transform.scale.set(windowWidth,style.window[1],1);transform.updateMatrix();windows.setMatrixAt(wc,transform.matrix);
            shade.setScalar(lit?1:night?.20:.8);windows.setColorAt(wc++,shade);
            const wx=a[0]+dx*t,wz=-(a[1]+dy*t);
            if(fc<maxFrames){transform.position.set(wx,h,wz);transform.updateMatrix();frames.setMatrixAt(fc++,transform.matrix);}
            // Residential balconies from the first upper floor, staggered by bay and floor.
            const floor=Math.round((h-min-style.floor*.56)/style.floor);
            if(bc<maxBalconies&&floor>=1&&(style.kind==='apartment'?(col+floor)%2===0:style.kind==='house'&&columns>=3&&col===1)){
              transform.position.set(wx,h-style.floor*.56,wz);transform.scale.set(1,1,1);transform.updateMatrix();balconies.setMatrixAt(bc++,transform.matrix);
            }
          }
        }
      }
    }
    windows.count=wc;windows.instanceMatrix.needsUpdate=true;if(windows.instanceColor)windows.instanceColor.needsUpdate=true;
    frames.count=fc;frames.instanceMatrix.needsUpdate=true;balconies.count=bc;balconies.instanceMatrix.needsUpdate=true;ledges.count=lgc;ledges.instanceMatrix.needsUpdate=true;
    let lc=0;
    if(detailed&&budget.windows)for(const lamp of placeLamps(lamps,x,y,budget.radius,LAMP_CAP)){
      const ground=elevation(lamp.x,lamp.y);
      transform.rotation.set(0,0,0);transform.position.set(lamp.x,ground,-lamp.y);transform.scale.set(1,1,1);transform.updateMatrix();
      poles.setMatrixAt(lc,transform.matrix);heads.setMatrixAt(lc,transform.matrix);
      transform.position.set(lamp.x,ground+.45,-lamp.y);transform.scale.set(34,1,34);transform.updateMatrix();glows.setMatrixAt(lc++,transform.matrix);
    }
    for(const mesh of lampMeshes){mesh.count=lc;mesh.instanceMatrix.needsUpdate=true;}
    return true;
  };
  const getStats=():DetailStats=>{const treeLods=vegetation.getStats();return {windows:windows.count,trees:treeLods.near+treeLods.mid+treeLods.far,lamps:poles.count,detailed:lastDetailed,treeLods};};
  return {group,update,getStats,vegetation,
    replaceWorld:(nextForms:BuildingForm[],nextData:WorldData,nextWork?:WorldWork)=>{forms=nextForms;lamps=lampSites(nextData,frame,nextForms);lastQuality=undefined;vegetation.replaceWorld(nextForms,nextData,nextWork);},
    inherit:(previous:{vegetation:typeof vegetation})=>vegetation.inherit(previous.vegetation),hasPending:vegetation.hasPending,animate:vegetation.animate,
    setElevation:(sample:(x:number,y:number)=>number)=>{elevation=sample;lastQuality=undefined;vegetation.setElevation(sample);},
    setTheme:(theme:WorldTheme)=>{windows.material.color.set(worldThemes[theme].palette.window);facadeMaterial.color.set('#e4e0d8').multiply(new THREE.Color(worldThemes[theme].buildingTint));ledgeMaterial.color.set('#f2eee6').multiply(new THREE.Color(worldThemes[theme].buildingTint));night=theme==='night';lastQuality=undefined;lampMeshes.forEach(mesh=>mesh.visible=night);vegetation.setTheme(theme);},
    dispose:()=>{disposed=true;poleGeometry.dispose();headGeometry.dispose();glowGeometry.dispose();lampMeshes.forEach(mesh=>(mesh.material as THREE.Material).dispose());ledges.geometry.dispose();ledgeMaterial.dispose();vegetation.dispose();}};
}

export type LampSite={x:number;y:number};
type Point2=[number,number];
type Surface={a:Point2;b:Point2;half:number;way:number};
/** Main roads: opposite pairs on both kerbs. Streets: one kerb. Metres along the road. */
export const LAMP_RULES={main:{spacing:44,both:true},street:{spacing:52,both:false},minGap:14,kerbClearance:.45,otherRoadClearance:2.5} as const;
const LAMP_CELL=24;
const cellKey=(x:number,y:number)=>`${Math.floor(x/LAMP_CELL)}/${Math.floor(y/LAMP_CELL)}`;
function segmentDistance(x:number,y:number,a:Point2,b:Point2){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;
  return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}
/**
 * Street lamps for a whole world, computed once. Each road is walked as one
 * continuous line, so spacing stays even across OSM vertices. A lamp is kept
 * only where it stands off every road surface (medians and the far side of
 * parallel carriageways are asphalt too), outside buildings, and clear of
 * nearby lamps. Main roads are placed first so they keep the regular rhythm.
 */
export function lampSites(data:WorldData,frame:LocalFrame,forms:readonly BuildingForm[]=[]):LampSite[]{
  const surfaces=new Map<string,Surface[]>(),ways:{points:Point2[];offset:number;tier:'main'|'street';id:string;way:number}[]=[];
  let way=0;
  for(const f of data.features){
    if(f.properties.kind!=='road'||f.geometry.type!=='LineString')continue;
    const profile=roadProfile(f.properties),tier=roadTier(profile.kind);
    if(tier==='path'||profile.tunnel)continue;
    const points=(f.geometry.coordinates as number[][]).map(([lng,lat])=>{const p=frame.project({lng,lat});return [p.x,p.y] as Point2;});
    const half=profile.width/2;way++;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],surface={a,b,half,way},pad=half+LAMP_RULES.otherRoadClearance;
      for(let cx=Math.floor((Math.min(a[0],b[0])-pad)/LAMP_CELL);cx<=Math.floor((Math.max(a[0],b[0])+pad)/LAMP_CELL);cx++)
        for(let cy=Math.floor((Math.min(a[1],b[1])-pad)/LAMP_CELL);cy<=Math.floor((Math.max(a[1],b[1])+pad)/LAMP_CELL);cy++){
          const key=`${cx}/${cy}`,list=surfaces.get(key);if(list)list.push(surface);else surfaces.set(key,[surface]);
        }
    }
    // Elevated or layered roads still block lamps below them but get none of their own.
    if(profile.bridge||profile.layer!==0)continue;
    const kerb=Math.max(profile.sidewalkLeft,profile.sidewalkRight);
    ways.push({points,tier,way,id:String(f.id??way),offset:half+(kerb?Math.min(kerb*.55,1.1):.9)});
  }
  const buildings=new Map<string,BuildingForm[]>();
  for(const form of forms)for(let cx=Math.floor(form.bounds.min.x/LAMP_CELL);cx<=Math.floor(form.bounds.max.x/LAMP_CELL);cx++)
    for(let cy=Math.floor(form.bounds.min.y/LAMP_CELL);cy<=Math.floor(form.bounds.max.y/LAMP_CELL);cy++){
      const key=`${cx}/${cy}`,list=buildings.get(key);if(list)list.push(form);else buildings.set(key,[form]);
    }
  const placed=new Map<string,LampSite[]>(),sites:LampSite[]=[];
  const clear=(x:number,y:number,owner:number)=>{
    // Its own carriageway only needs a kerb gap; any other road (a parallel
    // carriageway, a cross street at a junction) needs a wider berth.
    for(const s of surfaces.get(cellKey(x,y))||[])if(segmentDistance(x,y,s.a,s.b)<s.half+(s.way===owner?LAMP_RULES.kerbClearance:LAMP_RULES.otherRoadClearance))return false;
    for(const form of buildings.get(cellKey(x,y))||[])if(form.bounds.containsPoint(new THREE.Vector2(x,y))&&pointInPolygon(x,y,form.polygon))return false;
    const cx=Math.floor(x/LAMP_CELL),cy=Math.floor(y/LAMP_CELL);
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const lamp of placed.get(`${cx+i}/${cy+j}`)||[])if(Math.hypot(lamp.x-x,lamp.y-y)<LAMP_RULES.minGap)return false;
    return true;
  };
  ways.sort((a,b)=>a.tier===b.tier?(a.id<b.id?-1:a.id>b.id?1:0):a.tier==='main'?-1:1);
  for(const way of ways){
    const rule=LAMP_RULES[way.tier],lengths=way.points.slice(1).map((p,i)=>Math.hypot(p[0]-way.points[i][0],p[1]-way.points[i][1]));
    const total=lengths.reduce((n,v)=>n+v,0);if(total<12)continue;
    let index=0,travelled=0;
    for(let d=Math.min(rule.spacing/2,total/2);d<total;d+=rule.spacing){
      while(index<lengths.length-1&&travelled+lengths[index]<d){travelled+=lengths[index];index++;}
      const a=way.points[index],b=way.points[index+1],length=lengths[index]||1,t=Math.min(1,(d-travelled)/length);
      const nx=-(b[1]-a[1])/length,ny=(b[0]-a[0])/length,px=a[0]+(b[0]-a[0])*t,py=a[1]+(b[1]-a[1])*t;
      for(const side of rule.both?[1,-1]:[1]){
        const x=px+nx*way.offset*side,y=py+ny*way.offset*side;
        if(!clear(x,y,way.way))continue;
        const site={x,y},key=cellKey(x,y),list=placed.get(key);if(list)list.push(site);else placed.set(key,[site]);sites.push(site);
      }
    }
  }
  return sites;
}
/** The nearest `cap` lamp sites within `radius` of the camera target. */
export function placeLamps(sites:readonly LampSite[],x:number,y:number,radius:number,cap:number){
  const nearby:{site:LampSite;distance:number}[]=[];
  for(const site of sites){const distance=Math.hypot(site.x-x,site.y-y);if(distance<=radius)nearby.push({site,distance});}
  nearby.sort((a,b)=>a.distance-b.distance);
  return nearby.slice(0,cap).map(n=>n.site);
}
