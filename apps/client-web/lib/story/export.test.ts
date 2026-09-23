import {describe,it,expect,vi} from 'vitest';
import {exportNativeStory,type StoryBridge} from './export';
import type {StoryScene} from './scene';
import {DEFAULT_PLACEMENT} from './placement';
const scene={canvas:{toDataURL:()=> 'data:image/jpeg;base64,synthetic'},draw:vi.fn(),dispose:vi.fn()} as unknown as StoryScene;
const bridge=()=>({beginStory:vi.fn().mockResolvedValue({id:'synthetic'}),storyFrame:vi.fn().mockResolvedValue(undefined),finishStory:vi.fn().mockResolvedValue(undefined),cancelStory:vi.fn().mockResolvedValue(undefined),shareStory:vi.fn(),saveSticker:vi.fn()} satisfies StoryBridge);
describe('native story export adapter',()=>{
  it.each([['story',1280],['feed',900],['square',720]] as const)('starts the native encoder with matching %s dimensions',async(preset,height)=>{
    const b=bridge();await exportNativeStory(scene,{caption:'',placement:DEFAULT_PLACEMENT,preset},new AbortController().signal,()=>{},b);
    expect(b.beginStory).toHaveBeenCalledWith({width:720,height});
  });
  it('sends exactly 360 sequential frames and finishes without auto-sharing',async()=>{const b=bridge();const result=await exportNativeStory(scene,{caption:'Run',placement:DEFAULT_PLACEMENT},new AbortController().signal,()=>{},b);expect(b.storyFrame).toHaveBeenCalledTimes(360);expect(b.finishStory).toHaveBeenCalledWith({id:'synthetic'});expect(result.extension).toBe('mp4');expect(b.shareStory).not.toHaveBeenCalled();});
  it('cancels the partial native file after encoding failure',async()=>{const b=bridge();vi.mocked(b.storyFrame).mockRejectedValue(new Error('storage'));await expect(exportNativeStory(scene,{caption:'',placement:DEFAULT_PLACEMENT},new AbortController().signal,()=>{},b)).rejects.toThrow('storage');expect(b.cancelStory).toHaveBeenCalledWith({id:'synthetic'});expect(b.finishStory).not.toHaveBeenCalled();});
  it('does not start when cancelled',async()=>{const b=bridge(),c=new AbortController();c.abort();await expect(exportNativeStory(scene,{caption:'',placement:DEFAULT_PLACEMENT},c.signal,()=>{},b)).rejects.toThrow();expect(b.beginStory).not.toHaveBeenCalled();});
  it('keeps the chosen photo position and size for every exported frame',async()=>{
    const draw=vi.fn(),placed={...scene,draw},options={caption:'Run',placement:{x:180,y:900,size:260}};
    await exportNativeStory(placed,options,new AbortController().signal,()=>{},bridge());
    expect(draw).toHaveBeenCalledTimes(360);expect(draw.mock.calls.every(call=>call[1].placement===options.placement)).toBe(true);
    expect(options.placement).toEqual({x:180,y:900,size:260});
  });
});
