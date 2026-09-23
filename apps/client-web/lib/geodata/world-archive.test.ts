import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {neighborhood} from './osm';
import {readWorld,saveWorld} from './world-archive';

afterEach(()=>vi.unstubAllGlobals());

it('restores a previously loaded geographic area from local storage',async()=>{
  vi.stubGlobal('indexedDB',new IDBFactory());
  const area={...neighborhood(17000,15000),source:'OpenStreetMap' as const,fetchedAt:'',
    data:{type:'FeatureCollection' as const,features:[]}};
  expect(await readWorld(area.key)).toBeUndefined();
  await saveWorld(area);
  expect(await readWorld(area.key)).toEqual(area);
});
