import {activityStats} from '../tracking/activity-stats';
import type {SavedActivity} from '../tracking/storage';
import {RouteSticker,drawRouteSticker} from './route-sticker';
import type {RoutePlacement} from './placement';
import {presetPlacementRect,STORY_PRESETS,type StoryPreset} from './presets';
import {displayPlace} from '../geodata/display-place';
export {STORY_WIDTH,STORY_HEIGHT} from './placement';
export type StoryMetric='distance'|'time'|'pace'|'date'|'location';
export type StoryOptions={photo?:ImageBitmap;caption:string;placement:RoutePlacement;metrics?:StoryMetric[];preset?:StoryPreset};
export type StoryScene={canvas:HTMLCanvasElement;sticker:HTMLCanvasElement;overlay:HTMLCanvasElement;aspectRatio:number;drawSticker:(seconds:number)=>void;drawOverlay:(seconds:number,metrics?:StoryMetric[])=>void;draw:(seconds:number,options:StoryOptions)=>void;dispose:()=>void};

/** 2D route animation: no map tiles, buildings, location requests or GPU scene required. */
export async function createStoryScene(activity:SavedActivity):Promise<StoryScene>{
  const route=new RouteSticker(activity),stats=activityStats(activity),canvas=document.createElement('canvas'),sticker=document.createElement('canvas'),overlay=document.createElement('canvas');
  canvas.className='kl-photo-canvas';sticker.className='kl-gif-canvas';overlay.className='kl-png-canvas';
  canvas.width=720;canvas.height=1280;sticker.width=480;sticker.height=480;overlay.width=1440;overlay.height=1440;
  const ctx=canvas.getContext('2d',{alpha:false})!,ink=sticker.getContext('2d',{willReadFrequently:true})!,overlayInk=overlay.getContext('2d')!;let disposed=false;
  const aspectRatio=route.aspectRatio;
  const drawSticker=(seconds:number)=>{if(!disposed)drawRouteSticker(ink,route,seconds);};
  const metricValues=(metrics:StoryMetric[]|undefined)=>{
    const shown=new Set(metrics??['distance','time','pace']);
    return [
      shown.has('distance')?{label:'Distance',value:stats.distanceKm.toFixed(2),unit:'km'}:null,
      shown.has('time')?{label:'Time',value:stats.activeTime,unit:''}:null,
      shown.has('pace')?{label:activity.activityType==='cycle'?'Avg. speed':'Avg. pace',value:activity.activityType==='cycle'?stats.averageSpeedKph.toFixed(1):stats.averagePace.replace(' /km',''),unit:activity.activityType==='cycle'?'km/h':'/km'}:null,
      shown.has('date')?{label:'Date',value:new Date(activity.startedAtMs).toLocaleDateString(undefined,{day:'numeric',month:'short'}),unit:''}:null,
      shown.has('location')?{label:'Location',value:displayPlace(activity.placeName,'Outdoor activity'),unit:''}:null,
    ].filter((value):value is {label:string;value:string;unit:string}=>!!value);
  };
  const drawMetrics=(target:CanvasRenderingContext2D,values:ReturnType<typeof metricValues>,width:number,baseline:number,compact=false)=>{
    if(!values.length)return;
    const columns=Math.min(compact?2:3,values.length),rowHeight=compact?54:76,startX=compact?24:36,available=width-startX*2,columnWidth=available/columns;
    target.save();target.textBaseline='top';target.shadowColor='rgba(0,0,0,.92)';target.shadowBlur=12;target.shadowOffsetY=2;
    target.fillStyle='#e33b63';target.fillRect(startX,baseline-14,compact?34:44,3);
    values.forEach((item,index)=>{
      const column=index%columns,row=Math.floor(index/columns),x=startX+column*columnWidth,y=baseline+row*rowHeight;
      if(column){target.shadowColor='transparent';target.fillStyle='rgba(255,255,255,.35)';target.fillRect(x-14,y+3,1,compact?39:48);target.shadowColor='rgba(0,0,0,.92)';}
      target.fillStyle='rgba(255,255,255,.78)';target.font=compact?'500 11px Arial':'500 19px Arial';target.fillText(item.label,x,y);
      target.fillStyle='#fff';target.font=item.label==='Location'?(compact?'600 17px Arial':'600 24px Arial'):(compact?'700 21px Arial':'700 36px Arial');
      const valueLimit=(item.label==='Location'&&index===values.length-1?columnWidth*(columns-column):columnWidth)-(item.unit?62:20);
      let clipped=item.value;while(clipped.length>1&&target.measureText(clipped).width>valueLimit)clipped=clipped.slice(0,-2)+'…';
      target.fillText(clipped,x,y+(compact?17:25));
      if(item.unit){const valueWidth=Math.min(target.measureText(clipped).width,valueLimit);target.font=compact?'500 11px Arial':'500 18px Arial';target.fillStyle='rgba(255,255,255,.78)';target.fillText(item.unit,x+valueWidth+6,y+(compact?23:40));}
    });
    target.restore();
  };
  const drawOverlay=(seconds:number,metrics?:StoryMetric[])=>{
    if(disposed)return;overlayInk.clearRect(0,0,overlay.width,overlay.height);
    overlayInk.save();overlayInk.scale(2,2);overlayInk.save();overlayInk.translate(108,0);overlayInk.scale(1.05,1.05);drawRouteSticker(overlayInk,route,seconds,false);overlayInk.restore();
    const values=metricValues(metrics);drawMetrics(overlayInk,values,720,550,false);overlayInk.restore();
  };
  const draw=(seconds:number,options:StoryOptions)=>{
    if(disposed)return;
    const preset=options.preset??'story',height=STORY_PRESETS[preset].height,compact=preset!=='story';
    if(canvas.height!==height)canvas.height=height;
    ctx.fillStyle='#0b0c0e';ctx.fillRect(0,0,720,height);
    if(options.photo){const p=options.photo,scale=Math.max(720/p.width,height/p.height);ctx.drawImage(p,(720-p.width*scale)/2,(height-p.height*scale)/2,p.width*scale,p.height*scale);}
    const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'rgba(7,8,9,.58)');shade.addColorStop(.25,'rgba(7,8,9,0)');shade.addColorStop(.7,'rgba(7,8,9,.06)');shade.addColorStop(1,'rgba(7,8,9,.82)');ctx.fillStyle=shade;ctx.fillRect(0,0,720,height);
    ctx.textBaseline='top';

    // Premium Brand & Location / Date Header
    ctx.fillStyle='#ffffff';
    ctx.font='700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('YourLeft',44,48);
    ctx.fillStyle='#e33b63';
    ctx.beginPath();
    ctx.arc(44+ctx.measureText('YourLeft').width+8,60,3.5,0,Math.PI*2);
    ctx.fill();

    const locationText=activity.placeName||(activity.source==='demo'?'Madhyamaheshwar Valley':'Route in Motion');
    const activityDate=new Date(activity.startedAtMs||Date.now()).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    const metaText=`${locationText}  ·  ${activityDate}`;
    ctx.font='500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.72)';
    ctx.fillText(metaText,44,82);

    ctx.font=compact?'600 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif':'600 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle='#ffffff';
    const words=(options.caption.trim().slice(0,50)||'Every step, part of my story.').split(' ');
    let line='',y=compact?118:128,lines=0;for(const word of words){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>620&&line){ctx.fillText(line,44,y);y+=compact?36:48;line=word;lines++;if(compact&&lines>=2)break;}else line=next;}if(!compact||lines<2)ctx.fillText(line,44,y);
    const rect=presetPlacementRect(options.placement,preset,route.aspectRatio);
    ctx.save();
    ctx.translate(rect.left+rect.width/2,rect.top+rect.height/2);
    if(options.placement.rotation){
      ctx.rotate((options.placement.rotation*Math.PI)/180);
    }
    ctx.translate(-rect.width/2,-rect.height/2);
    ctx.scale(rect.width/480,rect.height/480);
    drawRouteSticker(ctx,route,seconds,false);
    ctx.restore();
    const values=metricValues(options.metrics);
    if(values.length){
      const columns=Math.min(compact?2:3,values.length),rows=Math.ceil(values.length/columns),metricsHeight=rows*(compact?54:68);
      drawMetrics(ctx,values,720,height-metricsHeight-(compact?28:44),compact);
    }
    if(!compact&&!values.length){ctx.font='400 15px Arial';ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillText('Recorded route · Time-compressed replay',44,1172);}
    if(route.at(seconds).gap){ctx.font='500 17px Arial';ctx.fillText('GPS gap · position held',44,compact?height-29:1210);}
  };
  return {canvas,sticker,overlay,aspectRatio,drawSticker,drawOverlay,draw,dispose(){disposed=true;route.dispose();canvas.remove();sticker.remove();overlay.remove();}};
}
