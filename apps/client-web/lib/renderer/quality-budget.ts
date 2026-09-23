export type Quality='battery'|'balanced'|'high';
export const qualityBudget={battery:{windows:0,trees:0,radius:0,pixels:1,spacing:4.5},balanced:{windows:1800,trees:12000,radius:220,pixels:1.25,spacing:5},high:{windows:4200,trees:20000,radius:350,pixels:2,spacing:3.5}};
/** Android WebView benefits from a stable drawing surface more than desktop
 * density. Pick the device budget before MapLibre creates its canvas; never
 * resize that shared MapLibre/Three surface during an activity. */
export function renderPixelRatio(quality:Quality,devicePixelRatio:number,android:boolean){
  const limit=android?(quality==='high'?1.25:1):qualityBudget[quality].pixels;
  return Math.min(Math.max(1,devicePixelRatio||1),limit);
}
