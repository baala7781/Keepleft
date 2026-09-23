/** Compose a close aerial miniature; a fully zoomed-out fixture leaves an empty horizon. */
export function overviewZoom(viewportWidth:number) {
  return Math.max(14.8,Math.min(15.8,15.25+.35*Math.log2(Math.max(1,viewportWidth)/520)));
}

/** Raised shoulder view: more context, less wall obstruction, feet remain in frame at high zoom. */
export function chaseCamera(point:{lng:number;lat:number;heading:number},height:number) {
  const bearing=180-point.heading*180/Math.PI;
  const radians=bearing*Math.PI/180,cosLat=Math.max(.08,Math.cos(point.lat*Math.PI/180));
  const lng=((point.lng+Math.sin(radians)*.25/(111320*cosLat)+540)%360)-180;
  const lat=Math.max(-85,Math.min(85,point.lat+Math.cos(radians)*.25/111320));
  // MapLibre's default vertical FOV gives a camera-to-center distance of 1.5× viewport height.
  const distanceM=24;
  const zoom=Math.max(19,Math.min(24,Math.log2(1.5*Math.max(200,height)*40075016.686*cosLat/(512*distanceM))));
  return {center:{lng,lat},bearing,pitch:62,zoom};
}

export function turnToward(current:number,target:number,blend:number) {
  return current+((((target-current)%360+540)%360)-180)*Math.max(0,Math.min(1,blend));
}

export type CameraMode='orbit'|'follow'|'free'|'chase';
export type CameraAdjustment={lng:number;lat:number;bearing:number;zoom:number;pitch:number};
export const neutralCamera=():CameraAdjustment=>({lng:0,lat:0,bearing:0,zoom:0,pitch:0});
export type CameraControls={mode:CameraMode;reducedMotion:boolean;revision:number;gesturing:boolean;selected:boolean;adjustment:CameraAdjustment;quality:'battery'|'balanced'|'high';worldTheme?:import('./world-theme').WorldTheme;presentationHeading?:number;presentationPosition?:{lng:number;lat:number};suspended?:boolean;manualFraming?:boolean;resumeAt?:number;angleGesture?:boolean;alignRoads?:boolean;staticScene?:boolean;showcaseCenter?:{lng:number;lat:number}};
export type CameraPose={center:{lng:number;lat:number};bearing:number;zoom:number;pitch:number};
export function baseCamera(mode:CameraMode,point:{lng:number;lat:number;heading:number},origin:{lng:number;lat:number},width:number,height:number):CameraPose {
  if(mode==='chase')return chaseCamera(point,height);
  return {center:mode==='follow'||mode==='orbit'?point:origin,bearing:mode==='follow'?180-point.heading*180/Math.PI:-25,zoom:mode==='follow'?18:overviewZoom(width),pitch:mode==='follow'?50:58};
}
/** Follow resumes centred on the athlete; user zoom/tilt/relative bearing stay intact. */
export function trackingAdjustment(mode:CameraMode,base:CameraPose,current:CameraPose):CameraAdjustment{
  const a=rememberCamera(base,current);return mode==='follow'||mode==='chase'?{...a,lng:0,lat:0}:a;
}
/** Gestures pause safety in the caller; a remembered angle must not disable it permanently. */
export function automaticObstruction(mode:CameraMode){return mode==='follow'||mode==='chase';}
export function rememberCamera(base:CameraPose,current:CameraPose):CameraAdjustment {
  return {lng:((current.center.lng-base.center.lng+540)%360)-180,lat:current.center.lat-base.center.lat,
    bearing:((current.bearing-base.bearing+540)%360)-180,zoom:current.zoom-base.zoom,pitch:current.pitch-base.pitch};
}
/** A selected tracking mode starts at its preset; free exploration keeps the current view. */
export function selectedCameraAdjustment(mode:CameraMode,base:CameraPose,current:CameraPose):CameraAdjustment {
  return mode==='free'?rememberCamera(base,current):neutralCamera();
}
export function adjustedCamera(base:CameraPose,a:CameraAdjustment):CameraPose {
  return {center:{lng:((base.center.lng+a.lng+540)%360)-180,lat:Math.max(-85,Math.min(85,base.center.lat+a.lat))},
    bearing:base.bearing+a.bearing,zoom:Math.max(13.5,Math.min(24,base.zoom+a.zoom)),pitch:Math.max(0,Math.min(80,base.pitch+a.pitch))};
}

/** Do not release camera automation between pointer-down and the end of inertia. */
export class CameraGestureGuard {
  private pointers=new Set<number>();
  constructor(private controls:Pick<CameraControls,'gesturing'>,private capture:()=>void){}
  begin(){this.controls.gesturing=true;}
  pointerDown(id:number){this.pointers.add(id);this.begin();}
  pointerUp(id:number){this.pointers.delete(id);}
  clearPointers(){this.pointers.clear();}
  settle(mapMoving:boolean){
    if(mapMoving||this.pointers.size||!this.controls.gesturing)return;
    this.capture();this.controls.gesturing=false;
  }
}
