import {activityStats} from '../tracking/activity-stats';
import type {SavedActivity} from '../tracking/storage';
import {RouteSticker,drawRouteSticker} from './route-sticker';
import type {RoutePlacement} from './placement';
import {presetPlacementRect,STORY_PRESETS,type StoryPreset} from './presets';
import {displayPlace} from '../geodata/display-place';
export {STORY_WIDTH,STORY_HEIGHT} from './placement';
export type StoryMetric='distance'|'time'|'pace'|'date'|'location';
export type StoryOptions={photo?:ImageBitmap;caption:string;placement:RoutePlacement;metrics?:StoryMetric[];preset?:StoryPreset};
export type StoryScene={canvas:HTMLCanvasElement;sticker:HTMLCanvasElement;drawSticker:(seconds:number)=>void;draw:(seconds:number,options:StoryOptions)=>void;dispose:()=>void};

/** 2D route animation: no map tiles, buildings, location requests or GPU scene required. */
export async function createStoryScene(activity:SavedActivity):Promise<StoryScene>{
  const route=new RouteSticker(activity),stats=activityStats(activity),canvas=document.createElement('canvas'),sticker=document.createElement('canvas');
  canvas.width=720;canvas.height=1280;sticker.width=480;sticker.height=480;
  const ctx=canvas.getContext('2d',{alpha:false})!,ink=sticker.getContext('2d',{willReadFrequently:true})!;let disposed=false;
  const drawSticker=(seconds:number)=>{if(!disposed)drawRouteSticker(ink,route,seconds);};
  const draw=(seconds:number,options:StoryOptions)=>{
    if(disposed)return;drawSticker(seconds);
    const preset=options.preset??'story',height=STORY_PRESETS[preset].height,compact=preset!=='story';
    if(canvas.height!==height)canvas.height=height;
    ctx.fillStyle='#0b0c0e';ctx.fillRect(0,0,720,height);
    if(options.photo){const p=options.photo,scale=Math.max(720/p.width,height/p.height);ctx.drawImage(p,(720-p.width*scale)/2,(height-p.height*scale)/2,p.width*scale,p.height*scale);}
    const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'rgba(7,8,9,.58)');shade.addColorStop(.25,'rgba(7,8,9,0)');shade.addColorStop(.7,'rgba(7,8,9,.06)');shade.addColorStop(1,'rgba(7,8,9,.82)');ctx.fillStyle=shade;ctx.fillRect(0,0,720,height);
    ctx.textBaseline='top';ctx.fillStyle='#fff';ctx.font='600 26px Arial';ctx.fillText('↖  Keepleft',44,52);
    ctx.font='500 17px Arial';ctx.fillText(activity.source==='demo'?'DEMO · ROUTE IN MOTION':'MY ROUTE. IN MOTION.',44,94);
    ctx.font=compact?'600 33px Arial':'600 44px Arial';const words=(options.caption.trim().slice(0,50)||'Every step, part of my story.').split(' ');
    let line='',y=compact?128:147,lines=0;for(const word of words){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>620&&line){ctx.fillText(line,44,y);y+=compact?38:52;line=word;lines++;if(compact&&lines>=2)break;}else line=next;}if(!compact||lines<2)ctx.fillText(line,44,y);
    const rect=presetPlacementRect(options.placement,preset);ctx.drawImage(sticker,rect.left,rect.top,rect.width,rect.height);
    const shown=new Set(options.metrics??['distance','time','pace']);
    const values=[
      shown.has('distance')?{label:'DISTANCE',value:`${stats.distanceKm.toFixed(2)} km`}:null,
      shown.has('time')?{label:'TIME',value:stats.activeTime}:null,
      shown.has('pace')?{label:activity.activityType==='cycle'?'AVG. SPEED':'AVG. PACE',value:activity.activityType==='cycle'?`${stats.averageSpeedKph.toFixed(1)} km/h`:stats.averagePace}:null,
      shown.has('date')?{label:'DATE',value:new Date(activity.startedAtMs).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}:null,
      shown.has('location')?{label:'LOCATION',value:displayPlace(activity.placeName,'Outdoor activity')}:null,
    ].filter((value):value is {label:string;value:string}=>!!value);
    if(values.length){
      const columns=Math.min(compact?2:3,values.length),rows=Math.ceil(values.length/columns),panelHeight=compact?Math.min(184,62+rows*58):Math.min(236,76+rows*70),panelY=height-panelHeight-28;
      ctx.fillStyle='rgba(8,9,11,.88)';ctx.beginPath();ctx.roundRect(28,panelY,664,panelHeight,22);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1;ctx.stroke();
      const cellWidth=616/columns;
      values.forEach((item,index)=>{const column=index%columns,row=Math.floor(index/columns),x=52+column*cellWidth,y=panelY+30+row*(compact?58:70);ctx.fillStyle='rgba(255,255,255,.58)';ctx.font=compact?'500 11px Arial':'500 13px Arial';ctx.fillText(item.label,x,y);ctx.fillStyle='#fff';ctx.font=compact?'600 20px Arial':'600 26px Arial';const clipped=item.value.length>24?`${item.value.slice(0,23)}…`:item.value;ctx.fillText(clipped,x,y+(compact?19:23),cellWidth-18);});
    }
    if(!compact&&!values.length){ctx.font='400 15px Arial';ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillText('Recorded route · Time-compressed replay',44,1172);}
    if(route.at(seconds).gap){ctx.font='500 17px Arial';ctx.fillText('GPS gap · position held',44,compact?height-29:1210);}
  };
  return {canvas,sticker,drawSticker,draw,dispose(){disposed=true;route.dispose();}};
}
