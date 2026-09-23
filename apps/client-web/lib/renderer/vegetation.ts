import * as THREE from 'three';
import type {LocalFrame} from '../../../../packages/geo';
import type {WorldData} from '../geodata/osm';
import type {BuildingForm} from './buildings';
import {treeAtlas,treeDimensions,treeGeometry,treeKinds,type TreeLOD} from './tree-canopy';
import {createVegetationPlacement} from './vegetation-placement';
import {noir} from './noir-palette';
import {worldThemes,type WorldTheme} from './world-theme';
import {qualityBudget} from './quality-budget';
import {LatestJob,localWorld,packForms,type WorldWork} from './background-work';
import type {TreePlacement} from './vegetation-placement';

export type VegetationStats={near:number;mid:number;far:number};
export function treeLOD(pixels:number,previous?:TreeLOD):TreeLOD {
  if(pixels>=(previous==='near'?36:44))return 'near';
  if(pixels>=(previous==='far'||!previous?13:10))return 'mid';
  return 'far';
}

/** Twelve pooled archetype/LOD batches; far silhouettes cost two triangles, not 504. */
export function createVegetation(forms:BuildingForm[],data:WorldData,frame:LocalFrame,work?:WorldWork,wake=()=>{}){
  const atlas=treeAtlas();
  let placement:ReturnType<typeof createVegetationPlacement>|undefined;
  const time={value:0},strength={value:0},bearing={value:0},pitch={value:1},viewport={value:new THREE.Vector2(1,1)};
  const makeMaterial=(cards:boolean)=>{
    const material=cards?new THREE.MeshBasicMaterial({map:atlas,color:'#747c70',vertexColors:true,alphaTest:.28,side:THREE.DoubleSide,alphaToCoverage:true})
      :new THREE.MeshStandardMaterial({color:noir.canopy,vertexColors:true,roughness:1});
    material.onBeforeCompile=shader=>{
      shader.uniforms.treeTime=time;shader.uniforms.treeWind=strength;
      shader.uniforms.treeBearing=bearing;shader.uniforms.treePitch=pitch;
      shader.uniforms.treeViewport=viewport;
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
        uniform float treeTime;uniform float treeWind;attribute float foliage;
        varying vec3 vTreeSurface;varying float vFoliage;
        ${cards?'uniform float treePitch;uniform float treeBearing;attribute float treeHeight;attribute float treeRadius;attribute float canopySpread;':''}`)
        .replace('#include <begin_vertex>',`#include <begin_vertex>
          vTreeSurface=position;vFoliage=foliage;
          float phase=dot(instanceMatrix[3].xz,vec2(.17,.23));
          float weight=pow(clamp(position.y/10.0,0.0,1.0),2.0);
          transformed.x+=sin(treeTime*.82+phase)*treeWind*weight;
          transformed.z+=sin(treeTime*.63+phase*1.3)*treeWind*weight*.6;`);
      if(cards)shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
        // Build the billboard in WORLD metres, then project once. Dividing
        // radius probes by clip.w made a far card near the eye expand into a
        // screen-sized opaque sheet as the camera crossed its plane.
        mat4 treeProjection=projectionMatrix*modelViewMatrix*instanceMatrix;
        vec3 right=vec3(cos(treeBearing),0.0,sin(treeBearing));
        vec3 up=vec3(sin(treeBearing)*cos(treePitch),sin(treePitch),-cos(treeBearing)*cos(treePitch));
        float canopyHeight=treeHeight*canopySpread;
        float cardHeight=mix(2.0*treeRadius*canopySpread,canopyHeight,sin(treePitch));
        vec3 billboard=vec3(0.0,canopyHeight*.5,0.0)+right*position.x*canopySpread+up*(position.y/treeHeight-.5)*cardHeight;
        vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(billboard,1.0);
        gl_Position=projectionMatrix*mvPosition;
      `);
      if(!cards)shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vTreeSurface;varying float vFoliage;
        float leafHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
        float leafNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
          return mix(mix(mix(leafHash(i),leafHash(i+vec3(1,0,0)),f.x),mix(leafHash(i+vec3(0,1,0)),leafHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(leafHash(i+vec3(0,0,1)),leafHash(i+vec3(1,0,1)),f.x),mix(leafHash(i+vec3(0,1,1)),leafHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
        .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(1.0,.78+.32*leafNoise(vTreeSurface*5.0),vFoliage);');
    };
    if(cards)material.onBeforeCompile=((compile)=>(shader,renderer)=>{
      compile(shader,renderer);
      // Side and crown atlas rows blend only across a small overhead angle band.
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float treePitch;')
        .replace('#include <map_fragment>',`#ifdef USE_MAP
          vec4 side=texture2D(map,vMapUv),top=texture2D(map,vMapUv+vec2(0.0,.5));
          diffuseColor*=mix(top,side,smoothstep(.25,.72,treePitch));
        #endif`);
    })(material.onBeforeCompile.bind(material));
    material.customProgramCacheKey=()=>cards?'keepleft-vegetation-billboard-v7':'keepleft-vegetation-mesh-v2';
    return material;
  };
  const solid=makeMaterial(false),cards=makeMaterial(true);
  const batches=treeKinds.flatMap(kind=>(['near','mid','far'] as TreeLOD[]).map(lod=>{
    const capacity=lod==='near'?192:lod==='mid'?800:qualityBudget.high.trees;
    const mesh=new THREE.InstancedMesh(treeGeometry(kind,lod),lod==='far'?cards:solid,capacity);
    if(lod==='far')mesh.geometry.setAttribute('canopySpread',new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1),1).setUsage(THREE.DynamicDrawUsage));
    mesh.name=`tree-${kind}-${lod}`;mesh.userData={vegetation:true,kind,lod};mesh.count=0;mesh.frustumCulled=false;
    mesh.castShadow=lod!=='far';mesh.receiveShadow=lod!=='far';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return {kind,lod,mesh,count:0,matrices:new Float32Array(capacity*16),colors:new Float32Array(capacity*3),spreads:new Float32Array(capacity)};
  }));
  const batchLookup=new Map(batches.map(b=>[b.kind+'/'+b.lod,b]));
  const matrix=new THREE.Object3D(),color=new THREE.Color();let previousLOD=new Map<string,TreeLOD>();
  let lastX=Infinity,lastY=Infinity,lastZoom=-1,lastQuality='',stats:VegetationStats={near:0,mid:0,far:0};
  let sampleX=Infinity,sampleY=Infinity,sampleQuality='',trees:TreePlacement[]=[];
  let elevation:(x:number,y:number)=>number=()=>0;
  let packing:Generator<void,void,unknown>|undefined,needsPack=false,currentZoom=0;
  let background:LatestJob<{x:number;y:number;limit:number},TreePlacement[]>|undefined;
  const replaceWorld=(nextForms:BuildingForm[],nextData:WorldData,nextWork?:WorldWork)=>{
    background?.dispose();packing=undefined;needsPack=false;work=nextWork;
    // Retain GPU meshes, materials, atlas and visible instance buffers. Only the
    // placement index changes; the old canopy stays until a full result commits.
    sampleQuality='';lastQuality='';
    if(nextWork){
      placement=undefined;
      const initialized=nextWork.run({kind:'vegetation-init',data:localWorld(nextData,frame),forms:packForms(nextForms)});
      void initialized.catch(()=>{});
      background=new LatestJob(async input=>{await initialized;return nextWork.run<TreePlacement[]>({kind:'vegetation',radius:2000,...input});},result=>{trees=result;needsPack=true;wake();});
    }else{background=undefined;placement=createVegetationPlacement(nextForms,nextData,frame);}
  };
  replaceWorld(forms,data,work);
  function* prepare(x:number,y:number,zoom:number,quality:'battery'|'balanced'|'high'){
    const nextStats:VegetationStats={near:0,mid:0,far:0},nextLOD=new Map<string,TreeLOD>();
    for(const batch of batches)batch.count=0;
    const mpp=40075016.686*Math.max(.08,Math.cos(frame.origin.lat*Math.PI/180))/(512*2**zoom);
    const nearLimit=quality==='high'?180:72,midLimit=quality==='high'?800:420;
    let processed=0;
    for(const tree of trees){
      const pixels=treeDimensions(tree.kind).height*tree.scale/mpp*1.7/(1+Math.hypot(tree.x-x,tree.y-y)/600);
      let lod=treeLOD(pixels,previousLOD.get(tree.key));
      // A spread card represents a group of distant crowns. Replacing it with
      // one small detailed tree punched a hole in the canopy on every LOD swap.
      if((tree.canopySpread||1)>1.05)lod='far';
      if(lod==='near'&&nextStats.near>=nearLimit)lod='mid';
      if(lod==='mid'&&nextStats.mid>=midLimit)lod='far';
      nextLOD.set(tree.key,lod);
      const batch=batchLookup.get(tree.kind+'/'+lod)!;
      matrix.position.set(tree.x,elevation(tree.x,tree.y),-tree.y);matrix.rotation.set(0,lod==='far'?0:tree.rotation,0);matrix.scale.setScalar(tree.scale);matrix.updateMatrix();
      const index=batch.count++;matrix.matrix.toArray(batch.matrices,index*16);
      batch.spreads[index]=tree.canopySpread||1;
      color.setScalar(.88+(tree.seed%100)/100*.2);color.toArray(batch.colors,index*3);nextStats[lod]++;
      if(++processed%128===0)yield;
    }
    // Commit complete buffers together; partial forests are never displayed.
    for(const {mesh,lod,count,matrices,colors,spreads} of batches){
      mesh.count=count;
      if(!count)continue;
      mesh.instanceMatrix.array.set(matrices.subarray(0,count*16));mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;
      if(!mesh.instanceColor)mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(colors.length),3).setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor.array.set(colors.subarray(0,count*3));mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,count*3);mesh.instanceColor.needsUpdate=true;
      if(lod==='far'){const spread=mesh.geometry.getAttribute('canopySpread') as THREE.InstancedBufferAttribute;spread.array.set(spreads.subarray(0,count));spread.clearUpdateRanges();spread.addUpdateRange(0,count);spread.needsUpdate=true;}
    }
    stats=nextStats;previousLOD=nextLOD;
  }
  const update=(x:number,y:number,zoom:number,quality:'battery'|'balanced'|'high')=>{
    const zoomStep=Math.round(zoom*4);
    const changed=lastQuality!==quality||lastZoom!==zoomStep||Math.hypot(lastX-x,lastY-y)>=(zoom>=17?24:90);
    if(changed){
    if(lastQuality!==quality){packing=undefined;needsPack=false;}
    lastX=x;lastY=y;lastZoom=zoomStep;lastQuality=quality;currentZoom=zoom;
    if(quality==='battery'){
      packing=undefined;needsPack=false;trees=[];previousLOD.clear();stats={near:0,mid:0,far:0};
      for(const batch of batches)batch.mesh.count=0;
      if(background)background.request({x,y,limit:0});sampleQuality=quality;sampleX=x;sampleY=y;return true;
    }
    // Zoom selects detail, not a new forest. The old abrupt radius change at
    // zoom 16 removed half the canopy and recalculated shadows in a single frame.
    if(sampleQuality!==quality||Math.hypot(sampleX-x,sampleY-y)>=90){
      sampleX=x;sampleY=y;sampleQuality=quality;
      if(background)background.request({x,y,limit:qualityBudget[quality].trees});
      else{trees=placement!.sample(x,y,2000,qualityBudget[quality].trees);needsPack=true;}
    }else needsPack=true;
    }
    if(!packing&&needsPack){needsPack=false;packing=prepare(lastX,lastY,currentZoom,quality);}
    if(!packing)return false;
    const deadline=performance.now()+2;
    do{if(packing.next().done){packing=undefined;return true;}}while(!work||performance.now()<deadline);
    return false;
  };
  const animate=(seconds:number,enabled:boolean,cameraBearing=0,cameraPitch=58,width=1,height=1)=>{
    time.value=enabled&&Number.isFinite(seconds)?seconds:0;strength.value=enabled?.14:0;
    bearing.value=cameraBearing*Math.PI/180;pitch.value=cameraPitch*Math.PI/180;
    viewport.value.set(Math.max(1,width),Math.max(1,height));
  };
  const inherit=(previous:{meshes:THREE.InstancedMesh[];snapshot:()=>{trees:TreePlacement[];lods:Map<string,TreeLOD>;stats:VegetationStats}})=>{
    const state=previous.snapshot();trees=state.trees;previousLOD=new Map(state.lods);stats={...state.stats};
    for(let i=0;i<batches.length;i++){
      const target=batches[i].mesh,source=previous.meshes[i],count=source.count;target.count=count;
      if(!count)continue;
      target.instanceMatrix.array.set(source.instanceMatrix.array.subarray(0,count*16));target.instanceMatrix.addUpdateRange(0,count*16);target.instanceMatrix.needsUpdate=true;
      if(source.instanceColor){target.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(batches[i].colors.length),3).setUsage(THREE.DynamicDrawUsage);target.instanceColor.array.set(source.instanceColor.array.subarray(0,count*3));target.instanceColor.addUpdateRange(0,count*3);target.instanceColor.needsUpdate=true;}
      const spread=target.geometry.getAttribute('canopySpread') as THREE.InstancedBufferAttribute|undefined;
      if(spread){spread.array.set((source.geometry.getAttribute('canopySpread') as THREE.InstancedBufferAttribute).array.subarray(0,count));spread.addUpdateRange(0,count);spread.needsUpdate=true;}
    }
  };
  return {meshes:batches.map(b=>b.mesh),update,animate,inherit,replaceWorld,snapshot:()=>({trees,lods:previousLOD,stats}),getStats:()=>({...stats}),hasPending:()=>!!packing||needsPack||!!background?.pending,
    setElevation:(sample:(x:number,y:number)=>number)=>{elevation=sample;lastZoom=-1;},
    setTheme:(theme:WorldTheme)=>{solid.color.set(worldThemes[theme].palette.canopy);cards.color.set(worldThemes[theme].farCanopy);},
    // Geometry/material/instance buffers are released by the owner scene's traversal.
    dispose:()=>{background?.dispose();packing=undefined;trees=[];atlas.dispose();previousLOD.clear();}};
}
