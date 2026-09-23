import * as THREE from 'three';
import {buildingForms,buildBuildingGeometry} from './buildings';
import type { CustomLayerInterface, Map as MapLibreMap, MercatorCoordinate as MC,GeoJSONSource } from 'maplibre-gl';
import { FloatingOrigin } from '../../../../packages/geo';
import { frame, sampleRoute } from '../tracking/activity';
import type {MotionSource} from '../tracking/motion-source';
import {baseCamera,adjustedCamera,automaticObstruction,turnToward,type CameraControls,type CameraMode} from './camera';
import {createRunner,RunnerAnimationClock} from './runner';
import {createNearbyDetails,type Quality,type DetailStats} from './details';
import {SteadyHeading} from './steady-heading';
import {loadAthlete,type Athlete} from './athlete';
import {cameraBlocks,clearCameraPitch,StableCameraPitch} from './obstruction';
import {MapPlaneFrame} from './map-frame';
import {RoutePresentation,routeLines} from './route-presentation';
import {noir} from './noir-palette';
import {renderSharedFrame} from './shared-frame';
import {applyMapTheme,worldThemes,type WorldTheme} from './world-theme';
import {visualRoute} from '../tracking/visual-route';
import {activityProfiles} from '../tracking/tracking-config';
import {createRoadWorld} from './roads';
import {createRouteRibbon} from './route-ribbon';
import {createBuildingWorld} from './building-world';
import {loadDemoTerrain} from './demo-terrain';
import demoManifest from '../../public/fixtures/madhyamaheshwar/manifest.json';
import {createWorldWork} from './world-work-client';
import {LatestJob,localWorld,unpackForms,type PreparedBuildings} from './background-work';
import {sameWorld} from '../geodata/same-world';

export type {CameraMode} from './camera';
export type Diagnostics = { fps:number; calls:number; triangles:number; geometries:number; rebases:number; buildMs:number; mapFeatures:number; detail:DetailStats;camera:{pitch:number;bearing:number;zoom:number};routeMs:number;roads?:ReturnType<ReturnType<typeof createRoadWorld>['getStats']>;buildings?:ReturnType<ReturnType<typeof createBuildingWorld>['getStats']>; frameCosts?:Record<'buildings'|'roads'|'details'|'three',number>; interaction?:{fps:number;p95:number;worst:number;slow:number;frames:number} };
export type StreamingWorldLayer=CustomLayerInterface&{replaceWorld(data:WorldData):void};
import type {WorldData,Ring} from '../geodata/osm';
export type {WorldFeature,WorldData} from '../geodata/osm';

export function validateWorld(value: unknown): WorldData {
  const data = value as WorldData;
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length > 15000) throw new Error('Invalid geographic fixture');
  for (const f of data.features) {
    if (!f.geometry || !f.properties || !['Polygon','LineString'].includes(f.geometry.type)) throw new Error('Unsupported feature');
    const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates as Ring[] : [f.geometry.coordinates as Ring];
    if (!Array.isArray(rings)) throw new Error('Invalid geometry');
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 2) throw new Error('Invalid ring');
      for (const p of ring) {
        if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new Error('Invalid coordinate');
      }
      if (f.geometry.type === 'Polygon' && (ring.length < 4 || ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1])) throw new Error('Unclosed polygon');
    }
  }
  return data;
}

export function buildBuildings(data: WorldData,worldFrame=frame) {
  return buildBuildingGeometry(buildingForms(data,worldFrame));
}

export function createWorldLayer(
  runtime:MotionSource,
  MercatorCoordinate:typeof MC,
  data:WorldData,
  controls:CameraControls,
  report:(d:Diagnostics)=>void,
  origin=frame.origin,
): StreamingWorldLayer {
  const buildStart = performance.now();
  const scene = new THREE.Scene();
  const worldFrame=new MapPlaneFrame(origin,MercatorCoordinate);
  const root = new THREE.Group();
  scene.add(root);
  const floating = new FloatingOrigin(worldFrame,600);
  const material = new THREE.MeshStandardMaterial({color:'#dddedd',roughness:1,metalness:0});
  const forms=buildingForms(data,worldFrame);
  let work=createWorldWork();const wake=()=>{if(!removed)map?.triggerRepaint();};
  let buildings=createBuildingWorld(forms,work,wake);root.add(buildings.group);
  const details=createNearbyDetails(forms,data,worldFrame,work,wake);root.add(details.group);
  let roads=createRoadWorld(data,worldFrame,forms,work,wake);root.add(roads.group);
  // Only the authored demo uses the bundled DEM. Recorded GPS worlds remain on
  // the existing flat render plane until terrain draping is implemented there.
  const mountainDemo=runtime.source==='demo'&&Math.abs(origin.lng-demoManifest.origin.lng)<.0001&&Math.abs(origin.lat-demoManifest.origin.lat)<.0001;
  let terrainHeight:((x:number,y:number)=>number)|undefined;
  if(mountainDemo)void loadDemoTerrain(worldFrame).then(({mesh,heightAt})=>{
    if(removed){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();return;}
    terrainHeight=heightAt;details.setElevation(heightAt);root.add(mesh);map?.triggerRepaint();
  }).catch(()=>{});
  const ribbon=createRouteRibbon(worldFrame);root.add(ribbon.group);
  let blocks=cameraBlocks(forms);
  const needsRoadPresentation=runtime.source!=='demo'&&!runtime.isDemoReplay&&runtime.activityType!=='cycle'&&runtime.roadAlignmentRecommended!==false;
  const emptyWorld:WorldData={type:'FeatureCollection',features:[]};
  // Fast/cycling replays deliberately show recorded truth instead of snapping
  // to OSM. Avoid rebuilding their unused spatial index at world boundaries.
  let routePresentation=new RoutePresentation(needsRoadPresentation?data:emptyWorld,worldFrame,needsRoadPresentation?forms:[]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6500,6500),new THREE.ShadowMaterial({opacity:0.48}));
  ground.rotation.x = -Math.PI/2;
  ground.position.y = 0.2;
  ground.receiveShadow = true;
  root.add(ground);
  const hemisphere=new THREE.HemisphereLight('#d5dcdf','#222628',2.1);scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#e1e1db',3);
  sun.position.set(-1400,1800,800);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-2600,right:2600,top:2600,bottom:-2600,near:10,far:6500});
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.8;
  root.add(sun,sun.target);
  const {runner,animate}=createRunner(material);
  const animationClock=new RunnerAnimationClock();
  root.add(runner);
  let athlete:Athlete|undefined,removed=false,athleteRequested=false;
  const requestAthlete=()=>{
    if(athleteRequested||controls.staticScene)return;athleteRequested=true;
    void loadAthlete().then(value=>{if(removed){value.dispose();return;}athlete=value;value.group.visible=false;root.add(value.group);map?.triggerRepaint();}).catch(()=>{});
  };
  const dotMaterial=new THREE.ShaderMaterial({
    uniforms:{size:{value:30}},transparent:true,depthTest:false,depthWrite:false,
    vertexShader:'uniform float size; void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=size;}',
    fragmentShader:'void main(){float r=length(gl_PointCoord-vec2(0.5))*2.0;if(r>1.0)discard;vec3 red=vec3(0.98,0.20,0.32);float core=1.0-smoothstep(.29,.34,r);float ring=smoothstep(.29,.32,r)*(1.0-smoothstep(.39,.43,r));float halo=.35*pow(1.0-r,1.4);gl_FragColor=vec4(mix(red,vec3(1.0,.79,.82),ring),max(max(core,ring),halo));}',
  });
  const locationDot=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3)),dotMaterial);
  locationDot.frustumCulled=false;locationDot.renderOrder=11;root.add(locationDot);
  const accuracyCircle=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:noir.route,transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide}));
  accuracyCircle.rotation.x=-Math.PI/2;accuracyCircle.visible=false;root.add(accuracyCircle);
  const base = MercatorCoordinate.fromLngLat(origin,0);
  const scale = base.meterInMercatorCoordinateUnits();
  const anchored = new THREE.Matrix4().makeTranslation(base.x,base.y,base.z)
    .scale(new THREE.Vector3(scale,-scale,scale)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2));
  const camera = new THREE.Camera();
  const projection=new THREE.Matrix4(), shifted=new THREE.Matrix4();
  let map:MapLibreMap, renderer:THREE.WebGLRenderer;
  let lastTheme:WorldTheme|undefined;
  const updateTheme=()=>{
    const theme=controls.worldTheme||'day';if(theme===lastTheme)return;
    lastTheme=theme;const value=worldThemes[theme];
    buildings.setTheme(theme);
    hemisphere.color.set(value.sky);hemisphere.groundColor.set(value.bounce);hemisphere.intensity=value.ambient;
    sun.color.set(value.sun);sun.intensity=value.sunIntensity;
    ground.material.opacity=value.shadow;renderer.toneMappingExposure=value.exposure;
    details.setTheme(theme);roads.setTheme(theme);applyMapTheme(map,theme);map.triggerRepaint();
  };
  let pendingCamera:(()=>void)|undefined;
  let shadowAt=0;
  // The MapLibre render event runs after ALL layers have used the same matrix.
  // Camera changes are not safe inside a custom draw call.
  const commitFrame=()=>{
    if(removed)return;
    updateTheme();
    const cameraUpdate=pendingCamera;pendingCamera=undefined;
    if(!controls.suspended)cameraUpdate?.();
  };
  let previous=0, reportAt=0, frames=0, frameTime=0,lastRevision=-1,lastMode:CameraMode='free',hadMotion=false;
  let lastReplayTime=0;
  let lastQuality:Quality|undefined;
  const renderedPosition=new THREE.Vector3(),motionTarget=new THREE.Vector3();let hasPosition=false;
  const steadyHeading=new SteadyHeading();
  const safePitch=new StableCameraPitch();
  let routeAt=0,routePending=false,routeMs=0;
  let frameCosts={buildings:0,roads:0,details:0,three:0};
  const interactionFrames:number[]=[];let wasInteracting=false;
  let lastBreakPoint='';
  const buildMs=performance.now()-buildStart;
  let installation:Generator<void,void,unknown>|undefined,installationFrame=0;
  const cancelInstallation=()=>{
    if(installationFrame)cancelAnimationFrame(installationFrame);installationFrame=0;
    installation?.return();installation=undefined;
  };
  const installWorld=(next:WorldData,prepared?:PreparedBuildings)=>{
      if(removed)return;
      cancelInstallation();
      function* prepareInstallation(){
      const nextWork=createWorldWork();
      let nextBuildings:ReturnType<typeof createBuildingWorld>|undefined,nextRoads:ReturnType<typeof createRoadWorld>|undefined,committed=false;
      try{
      const nextForms=prepared?unpackForms(prepared.forms):buildingForms(next,worldFrame);
      nextBuildings=createBuildingWorld(nextForms,nextWork,wake,prepared?.far);yield;
      yield;
      nextRoads=createRoadWorld(next,worldFrame,nextForms,nextWork,wake);yield;
      const nextBlocks=cameraBlocks(nextForms),nextPresentation=needsRoadPresentation?new RoutePresentation(next,worldFrame,nextForms):routePresentation;yield;
      // Reuse the forest GPU resources across neighborhood changes. Recreating
      // and disposing twelve instance pools caused a large upload on every swap.
      details.replaceWorld(nextForms,next,nextWork);
      nextRoads.setTheme(controls.worldTheme||'day');
      nextRoads.inheritPatch(roads.group);
      root.remove(roads.group);roads.dispose();roads=nextRoads;root.add(roads.group);
      root.remove(buildings.group);buildings.dispose();buildings=nextBuildings;buildings.setTheme(controls.worldTheme||'day');root.add(buildings.group);
      work?.dispose();work=nextWork;
      blocks=nextBlocks;routePresentation=nextPresentation;committed=true;
      renderer.shadowMap.needsUpdate=true;map.triggerRepaint();
      }finally{if(!committed){nextBuildings?.dispose();nextRoads?.dispose();nextWork?.dispose();}}
      }
      installation=prepareInstallation();
      if(!prepared){while(!installation.next().done){/* Synchronous non-browser test adapter. */}installation=undefined;return;}
      const advance=()=>{
        installationFrame=0;if(removed||!installation)return;
        try{if(installation.next().done){installation=undefined;return;}}
        catch{installation=undefined;return;}
        installationFrame=requestAnimationFrame(advance);
      };
      installationFrame=requestAnimationFrame(advance);
  };
  // Keep the current scene usable until the newest neighborhood is prepared.
  // Coalescing prevents streaming/prefetch replies from queuing obsolete rebuilds.
  const preparationWork=createWorldWork();
  let requestedWorld=data;
  const replacements=preparationWork?new LatestJob<WorldData,{data:WorldData;prepared:PreparedBuildings}>(
    async next=>({data:next,prepared:await preparationWork.run<PreparedBuildings>({kind:'world',data:localWorld(next,worldFrame)})}),
    result=>installWorld(result.data,result.prepared),
  ):undefined;
  return {
    id:'atlas-hero-world',type:'custom',renderingMode:'3d',
    replaceWorld(next){if(removed||sameWorld(next,requestedWorld))return;cancelInstallation();requestedWorld=next;if(replacements)replacements.request(next);else installWorld(next);},
    onAdd(instance,gl) {
      map=instance;
      renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});
      renderer.autoClear=false;
      // Balanced must keep a fixed shader configuration during playback.
      // Dynamic shadows are opt-in; toggling them under load recompiles every
      // receiving material precisely when the device is already struggling.
      renderer.shadowMap.enabled=controls.quality==='high';
      renderer.shadowMap.type=THREE.PCFShadowMap;
      renderer.shadowMap.autoUpdate=false;
      renderer.shadowMap.needsUpdate=true;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.05;
      map.on('render',commitFrame);
    },
    render(_gl,args) {
      if(controls.suspended){previous=0;return;}
      const now=performance.now(), dt=previous ? Math.min((now-previous)/1000,0.1) : 0;
      const interacting=controls.gesturing||map.isMoving();
      if(previous&&(interacting||wasInteracting)&&typeof document!=='undefined'&&document.visibilityState!=='hidden'){interactionFrames.push(now-previous);if(interactionFrames.length>240)interactionFrames.shift();}
      wasInteracting=interacting;
      if (previous && now-previous < 1000) { frameTime+=now-previous; frames++; }
      previous=now;
      if(lastQuality!==controls.quality){
        lastQuality=controls.quality;renderer.shadowMap.enabled=lastQuality==='high';renderer.shadowMap.needsUpdate=true;
      }
      const snapshot=runtime.getSnapshot(), motion=runtime.getMotion(controls.alignRoads!==false),sample=motion||(runtime.source==='demo'?sampleRoute(0):{...origin,heading:0});
      const thirdPerson=controls.mode==='chase';
      if(thirdPerson)requestAthlete();
      runner.visible=!!motion&&thirdPerson&&!athlete;locationDot.visible=!!motion;
      if(athlete)athlete.group.visible=!!motion&&thirdPerson;
      dotMaterial.uniforms.size.value=(thirdPerson?22:34)*map.getCanvas().width/Math.max(1,map.getCanvas().clientWidth);
      if(now>=routeAt&&!routePending){
        const routeStart=performance.now();
        routeAt=now+200;
        // Bike GPS in motion is already both dense and accurate. Snapping it to
        // nearby OSM centre-lines can choose the wrong parallel/service road at
        // segment restarts, creating a zigzag that is absent from the recording.
        // Keep the bounded display smoothing, but present cycling on its recorded
        // path. Walking/running retain conservative road alignment.
        const raw=motion?runtime.getTrail(runtime.source==='replay'||controls.alignRoads!==false):[];
        const aligned=controls.alignRoads!==false&&runtime.activityType!=='cycle'&&runtime.roadAlignmentRecommended!==false&&runtime.source!=='demo'&&!runtime.isDemoReplay;
        const shown=runtime.source==='gps'?visualRoute(raw,worldFrame,runtime.activityType||'run'):raw;
        const trail=routePresentation.trail(shown,aligned),gaps=routePresentation.gaps(raw,aligned),threeRoute=map.getZoom()>=16.2;
        // The vector and Three routes are mutually exclusive by zoom. Updating
        // both made replay pay for two complete line rebuilds every 200 ms.
        if(threeRoute)ribbon.update(trail,gaps);
        else {
          const lines=routeLines(trail);lines.features.push(...gaps);
          const source=map.getSource('activity-route') as GeoJSONSource|undefined;
          if(source){routePending=true;void source.setData(lines).catch(()=>{}).finally(()=>{routePending=false;});}
        }
        routeMs=performance.now()-routeStart;
      }
      const shown=routePresentation.position(sample,controls.alignRoads!==false&&runtime.activityType!=='cycle'&&runtime.roadAlignmentRecommended!==false&&runtime.source!=='demo'&&!runtime.isDemoReplay);
      const p=worldFrame.project(shown);
      // Gestures remain available in every mode: populate detail where the camera is looking.
      const detailPoint=worldFrame.project(map.getCenter());
      let phaseAt=performance.now();
      if(buildings.update(detailPoint.x,detailPoint.y,map.getZoom(),controls.quality))renderer.shadowMap.needsUpdate=true;
      frameCosts.buildings=Math.max(frameCosts.buildings,performance.now()-phaseAt);phaseAt=performance.now();
      roads.update(detailPoint.x,detailPoint.y,map.getZoom(),controls.quality);
      frameCosts.roads=Math.max(frameCosts.roads,performance.now()-phaseAt);phaseAt=performance.now();
      ribbon.setView(map.getZoom(),origin.lat);
      if(details.update(detailPoint.x,detailPoint.y,map.getZoom(),controls.quality))renderer.shadowMap.needsUpdate=true;
      details.animate(now/1000,!controls.reducedMotion&&!controls.staticScene&&controls.quality!=='battery',map.getBearing(),map.getPitch(),map.getCanvas().width,map.getCanvas().height);
      frameCosts.details=Math.max(frameCosts.details,performance.now()-phaseAt);
      const moving=snapshot.status==='recording'&&snapshot.speedMps>0;
      if (floating.update(sample)){renderer.shadowMap.needsUpdate=true;shadowAt=0;}
      const offset=floating.offset;
      root.position.set(-offset.x,-offset.y,-offset.z);
      motionTarget.set(p.x,0.22,-p.y);
      const breakPoint=motion?.breakBefore?`${sample.lng}/${sample.lat}`:'';
      const reset=!hasPosition||(!!breakPoint&&breakPoint!==lastBreakPoint)||Math.abs(snapshot.elapsedMs-lastReplayTime)>2000&&runtime.source==='replay';
      lastBreakPoint=breakPoint;
      if(reset||runtime.source==='demo'||renderedPosition.distanceTo(motionTarget)>100)renderedPosition.copy(motionTarget);
      else renderedPosition.lerp(motionTarget,1-Math.exp(-dt*(runtime.source==='replay'?6:activityProfiles[runtime.activityType||'run'].cameraFollowRate)));
      hasPosition=true;
      runner.position.copy(renderedPosition);
      locationDot.position.copy(renderedPosition);
      locationDot.position.y=1.3;
      accuracyCircle.visible=!thirdPerson&&runtime.source==='gps'&&!!motion?.accuracyM;
      if(accuracyCircle.visible){accuracyCircle.position.copy(renderedPosition);accuracyCircle.position.y=.24;accuracyCircle.scale.setScalar(Math.max(1,motion!.accuracyM!));}
      const heading=steadyHeading.update(renderedPosition.x,renderedPosition.z,sample.heading,dt,moving,reset,motion?.accuracyM);
      controls.presentationHeading=heading;runner.rotation.y=heading;
      const gaitMs=animationClock.advance(dt,moving);
      animate(gaitMs,snapshot.speedMps,moving&&!controls.reducedMotion);
      if(athlete&&thirdPerson){athlete.group.position.copy(renderedPosition);athlete.group.rotation.y=heading;athlete.setPose(gaitMs/1000,snapshot.speedMps,moving&&!controls.reducedMotion);}
      // Both the CPU anchor and scene shift change atomically; geographic positions remain invariant.
      shifted.makeTranslation(offset.x,offset.y,offset.z);
      camera.projectionMatrix.copy(projection.fromArray(args.defaultProjectionData.mainMatrix)).multiply(anchored).multiply(shifted);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      // LOD arrivals can mark every consecutive frame dirty. Bound the costly
      // second render pass while preserving a pending refresh for the next slot.
      const shadowDirty=renderer.shadowMap.needsUpdate,refreshShadow=renderer.shadowMap.enabled&&shadowDirty&&now>=shadowAt;
      renderer.shadowMap.needsUpdate=refreshShadow;
      if(refreshShadow)shadowAt=now+500;
      phaseAt=performance.now();renderSharedFrame(renderer,scene,camera,_gl);
      if(shadowDirty&&!refreshShadow)renderer.shadowMap.needsUpdate=true;
      frameCosts.three=Math.max(frameCosts.three,performance.now()-phaseAt);
      const modeChanged=controls.mode!==lastMode||controls.revision!==lastRevision||!!motion!==hadMotion;
      const presentationPoint={...worldFrame.unproject({x:renderedPosition.x,y:-renderedPosition.z,z:0}),heading};
      controls.presentationPosition=presentationPoint;
      const cameraPoint=controls.showcaseCenter&&runtime.source==='demo'&&snapshot.status==='ready'&&controls.mode==='orbit'&&!controls.selected?{...controls.showcaseCenter,heading:0}:presentationPoint;
      const target=adjustedCamera(baseCamera(controls.mode,cameraPoint,origin,map.getCanvas().clientWidth,map.getCanvas().clientHeight),controls.adjustment);
      if(mountainDemo&&controls.mode==='orbit'&&snapshot.status==='ready'&&!controls.selected){target.zoom=14.65+controls.adjustment.zoom;target.pitch=67+controls.adjustment.pitch;}
      if(automaticObstruction(controls.mode)&&!controls.gesturing&&now>=(controls.resumeAt||0)){
        const c=worldFrame.project(target.center),distance=1.5*map.getCanvas().clientHeight*40075016.686*Math.cos(target.center.lat*Math.PI/180)/(512*2**target.zoom);
        const clear=clearCameraPitch(c.x,-c.y,target.bearing,distance,target.pitch,blocks);
        target.pitch=safePitch.update(clear,dt,modeChanged);
      }else safePitch.reset(map.getPitch());
      pendingCamera=()=>{
      if(modeChanged&&!controls.gesturing){
        lastMode=controls.mode;lastRevision=controls.revision;hadMotion=!!motion;
        // Free selection remembers the current frame; reset and tracking selections use presets.
        // Even before a GPS actor is available, apply the selected angle around the map origin.
        map.jumpTo(target);
      }
      // A one-finger angle gesture changes only orientation. Keep translating with
      // the runner during it; panning/pinching temporarily suspends that translation.
      if(controls.angleGesture&&motion&&(controls.mode==='follow'||thirdPerson))map.jumpTo({center:target.center});
      if (!map.isMoving()&&!controls.gesturing&&now>=(controls.resumeAt||0)) {
        if((controls.mode==='chase'||controls.mode==='follow')&&motion){
          const current=map.getCenter();
          const dlng=((target.center.lng-current.lng+540)%360)-180;
          const jump=Math.abs(snapshot.elapsedMs-lastReplayTime)>2000||Math.hypot(dlng*Math.cos(sample.lat*Math.PI/180),target.center.lat-current.lat)*111320>50;
          const blend=jump||controls.reducedMotion?1:1-Math.exp(-dt*6);
          map.jumpTo({center:[((current.lng+dlng*blend+540)%360)-180,current.lat+(target.center.lat-current.lat)*blend],bearing:turnToward(map.getBearing(),target.bearing,blend),pitch:target.pitch,zoom:target.zoom});
        }
        if (controls.mode==='orbit'&&!controls.reducedMotion&&(snapshot.status!=='ready'||controls.selected)) map.jumpTo({bearing:map.getBearing()+dt*2.2});
      }
      lastReplayTime=snapshot.elapsedMs;
      };
      if (now-reportAt>1000) {
        const sorted=[...interactionFrames].sort((a,b)=>a-b),sum=sorted.reduce((n,v)=>n+v,0);
        const interaction=sorted.length?{fps:Math.round(1000*sorted.length/sum),p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],worst:sorted.at(-1)!,slow:sorted.filter(v=>v>50).length,frames:sorted.length}:undefined;
        report({fps:frameTime ? Math.round(frames*1000/frameTime):0,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,rebases:floating.revision,buildMs,detail:details.getStats(),mapFeatures:requestedWorld.features.length,camera:{pitch:map.getPitch(),bearing:map.getBearing(),zoom:map.getZoom()},routeMs,roads:roads.getStats(),buildings:buildings.getStats(),frameCosts,interaction});
        reportAt=now;frames=0;frameTime=0;frameCosts={buildings:0,roads:0,details:0,three:0};
      }
      if(!controls.staticScene||buildings.hasPending()||details.hasPending())map.triggerRepaint();
    },
    onRemove() {
      removed=true;map.off('render',commitFrame);pendingCamera=undefined;
      cancelInstallation();
      replacements?.dispose();preparationWork?.dispose();
      work?.dispose();
      if(athlete){root.remove(athlete.group);athlete.dispose();}
      root.remove(roads.group,ribbon.group,buildings.group);roads.dispose();ribbon.dispose();buildings.dispose();
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      scene.traverse(o=>{
        if (o instanceof THREE.Mesh||o instanceof THREE.Points) { geometries.add(o.geometry); for(const m of Array.isArray(o.material)?o.material:[o.material]) materials.add(m); }
        if(o instanceof THREE.InstancedMesh)o.dispose();
      });
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      details.dispose();
      sun.shadow.map?.dispose();
      renderer?.dispose();
    },
  };
}
