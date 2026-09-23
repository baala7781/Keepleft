import {it,expect,vi} from 'vitest';
import {loadNeighborhood,readMapResponse} from './service';
const response=()=>Response.json({elements:[{type:'way',id:1,tags:{leisure:'park'},geometry:[{lon:0,lat:0},{lon:.001,lat:0},{lon:.001,lat:.001},{lon:0,lat:0}]}]});
it('deduplicates neighborhood fetches and reuses public map data',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response());
  const [a,b]=await Promise.all([loadNeighborhood(100,100,fetcher),loadNeighborhood(100,100,fetcher)]);
  expect(a).toBe(b);expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await loadNeighborhood(100,100,fetcher)).toBe(a);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1].method).toBe('POST');
});
it('uses a second public mirror after an upstream error',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('Unavailable',{status:504})).mockResolvedValueOnce(response());
  expect((await loadNeighborhood(101,100,fetcher)).data.features[0].properties.kind).toBe('green');
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('rejects offline and oversized responses without claiming map readiness',async()=>{
  const fetcher=vi.fn().mockRejectedValue(new Error('offline'));
  await expect(loadNeighborhood(102,100,fetcher)).rejects.toThrow('unavailable');
  await expect(readMapResponse(new Response(new Uint8Array(8*1024*1024+1)))).rejects.toThrow('too detailed');
});
