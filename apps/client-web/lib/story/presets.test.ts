import {describe,it,expect} from 'vitest';
import {DEFAULT_PLACEMENT} from './placement';
import {presetPlacementRect,STORY_PRESETS} from './presets';

describe('photo-story aspect presets',()=>{
  it('keeps the portrait placement unchanged',()=>{
    expect(presetPlacementRect(DEFAULT_PLACEMENT,'story')).toEqual({left:70,top:360,width:580,height:580});
  });
  it('scales the movable route inside feed and square without clipping it',()=>{
    for(const preset of ['feed','square'] as const){
      const rect=presetPlacementRect(DEFAULT_PLACEMENT,preset),size=STORY_PRESETS[preset];
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.left+rect.width).toBeLessThanOrEqual(size.width);
      expect(rect.top+rect.height).toBeLessThanOrEqual(size.height);
    }
  });
  it('uses the promised social dimensions',()=>{
    expect([STORY_PRESETS.story.width,STORY_PRESETS.story.height]).toEqual([720,1280]);
    expect([STORY_PRESETS.feed.width,STORY_PRESETS.feed.height]).toEqual([720,900]);
    expect([STORY_PRESETS.square.width,STORY_PRESETS.square.height]).toEqual([720,720]);
  });
});
