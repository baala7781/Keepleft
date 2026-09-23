import {describe,it,expect} from 'vitest';
import {stickerIndices} from './sticker-export';
describe('transparent GIF palette',()=>{
  it('keeps clear pixels transparent, white details opaque and the route crimson',()=>{expect([...stickerIndices(new Uint8ClampedArray([255,255,255,0,255,255,255,255,243,59,83,255]))]).toEqual([0,2,1]);});
  it('uses a crisp alpha threshold rather than a baked-in background',()=>{expect([...stickerIndices(new Uint8ClampedArray([0,0,0,127,255,255,255,128]))]).toEqual([0,2]);});
});
