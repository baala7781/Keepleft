import {describe,expect,it,vi} from 'vitest';
import {exportRoutePng} from './png-export';
import type {StoryScene} from './scene';

describe('transparent route PNG',()=>{
  it('renders the completed route and selected metrics without a background encoder',async()=>{
    const blob=new Blob(['png'],{type:'image/png'}),drawOverlay=vi.fn();
    const scene={drawOverlay,overlay:{toBlob:(callback:(value:Blob|null)=>void)=>callback(blob)}} as unknown as StoryScene;
    const result=await exportRoutePng(scene,['distance','time']);
    expect(drawOverlay).toHaveBeenCalledWith(12,['distance','time']);
    expect(result).toMatchObject({blob,extension:'png'});
  });
});
