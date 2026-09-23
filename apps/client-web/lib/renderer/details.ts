import * as THREE from 'three';
import type {BuildingForm} from './buildings';
import type {WorldData} from '../geodata/osm';
import type {LocalFrame} from '../../../../packages/geo';
import {createVegetation,type VegetationStats} from './vegetation';
import {noir} from './noir-palette';
import {worldThemes,type WorldTheme} from './world-theme';
import {buildingProfile} from './building-profile';
import type {WorldWork} from './background-work';
export {pointInPolygon} from './vegetation-placement';

import {qualityBudget,type Quality} from './quality-budget';
export {qualityBudget,type Quality} from './quality-budget';
export type DetailStats={windows:number;trees:number;detailed:boolean;treeLods:VegetationStats};
/** Geographic building detail and semantic vegetation share a lifecycle, not capture state. */
export function createNearbyDetails(forms:BuildingForm[],data:WorldData,frame:LocalFrame,work?:WorldWork,wake=()=>{}){
  const group=new THREE.Group(),windowGeometry=new THREE.PlaneGeometry(1,1);
  const windows=new THREE.InstancedMesh(windowGeometry,new THREE.MeshBasicMaterial({color:noir.window,side:THREE.DoubleSide}),4200);
  windows.count=0;windows.frustumCulled=false;windows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(windows);
  const vegetation=createVegetation(forms,data,frame,work,wake);group.add(...vegetation.meshes);
  const transform=new THREE.Object3D(),center=new THREE.Vector2(),last=new THREE.Vector2(Infinity,Infinity),shade=new THREE.Color();
  let lastQuality:Quality|undefined,lastDetailed=false;
  const update=(x:number,y:number,zoom:number,quality:Quality)=>{
    const changed=vegetation.update(x,y,zoom,quality),detailed=zoom>=16;center.set(x,y);
    if(lastQuality===quality&&lastDetailed===detailed&&last.distanceTo(center)<40)return changed;
    last.copy(center);lastQuality=quality;lastDetailed=detailed;
    const budget=qualityBudget[quality];let wc=0;
    const nearby=detailed&&budget.windows?forms.filter(f=>f.bounds.distanceToPoint(center)<budget.radius).sort((a,b)=>a.bounds.distanceToPoint(center)-b.bounds.distanceToPoint(center)):[];
    outer:for(const form of nearby){
      const style=buildingProfile(form.properties);
      const height=Number(form.properties.height)||12,min=Number(form.properties.minHeight)||0,eave=height-(form.properties.roofShape==='flat'?0:Number(form.properties.roofHeight)||0);
      for(const ring of form.polygon){
        let area=0;for(let i=1;i<ring.length;i++)area+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];
        for(let i=1;i<ring.length;i++){
          const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<2.5)continue;
          const sign=area>0?1:-1,nx=dy/length*sign,nz=dx/length*sign,columns=Math.min(25,Math.floor(length/Math.max(style.bay,budget.spacing)));
          for(let h=min+style.floor*.56;h<eave-.65;h+=style.floor)for(let col=0;col<columns;col++){
            if(wc>=budget.windows)break outer;
            const lit=(col+Math.floor(h)*7+i*3)%5===0;
            const t=(col+.5)/columns;transform.position.set(a[0]+dx*t+nx*.045,h,-(a[1]+dy*t)+nz*.045);transform.rotation.set(0,Math.atan2(nx,nz),0);transform.scale.set(style.window[0],style.window[1],1);transform.updateMatrix();windows.setMatrixAt(wc,transform.matrix);
            shade.setScalar(lit?1:.20);windows.setColorAt(wc++,shade);
          }
        }
      }
    }
    windows.count=wc;windows.instanceMatrix.needsUpdate=true;if(windows.instanceColor)windows.instanceColor.needsUpdate=true;return true;
  };
  const getStats=():DetailStats=>{const treeLods=vegetation.getStats();return {windows:windows.count,trees:treeLods.near+treeLods.mid+treeLods.far,detailed:lastDetailed,treeLods};};
  return {group,update,getStats,vegetation,replaceWorld:(nextForms:BuildingForm[],nextData:WorldData,nextWork?:WorldWork)=>{forms=nextForms;lastQuality=undefined;vegetation.replaceWorld(nextForms,nextData,nextWork);},inherit:(previous:{vegetation:typeof vegetation})=>vegetation.inherit(previous.vegetation),hasPending:vegetation.hasPending,animate:vegetation.animate,setElevation:vegetation.setElevation,setTheme:(theme:WorldTheme)=>{windows.material.color.set(worldThemes[theme].palette.window);vegetation.setTheme(theme);},dispose:vegetation.dispose};
}
