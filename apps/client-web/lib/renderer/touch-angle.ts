/** Single-finger angle adjustment; pinch gestures stay with MapLibre. */
export function dragAngle(bearing:number,pitch:number,dx:number,dy:number){
  return {bearing:bearing-dx*.35,pitch:Math.max(0,Math.min(80,pitch-dy*.25))};
}
