import {placementRect,type RoutePlacement,STORY_HEIGHT,STORY_WIDTH} from './placement';

export type StoryPreset='story'|'feed'|'square';
export const STORY_PRESETS:Record<StoryPreset,{label:string;ratio:string;width:number;height:number}>={
  story:{label:'Story / Reel',ratio:'9:16',width:720,height:1280},
  feed:{label:'Feed',ratio:'4:5',width:720,height:900},
  square:{label:'Square',ratio:'1:1',width:720,height:720},
};

/** Photo placement remains in portrait coordinates; each preset composes it in its own frame. */
export function presetPlacementRect(value:RoutePlacement,preset:StoryPreset){
  const rect=placementRect(value),scale=STORY_PRESETS[preset].height/STORY_HEIGHT;
  return {left:STORY_WIDTH/2+(rect.left-STORY_WIDTH/2)*scale,top:rect.top*scale,width:rect.width*scale,height:rect.height*scale};
}
