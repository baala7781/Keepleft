import { describe, expect, it } from 'vitest';
import { ActivityRuntime, durationMs, playbackRate, totalDistanceM, sampleRoute, route } from '../lib/tracking/activity';

describe('Synthetic activity clock',()=>{
  it('advances without any renderer and clamps completion exactly',()=>{
    const runtime=new ActivityRuntime();runtime.start(1000);
    const half=runtime.update(1000+durationMs/playbackRate/2);
    expect(half.progress).toBeCloseTo(0.5);
    expect(half.distanceM).toBeCloseTo(totalDistanceM/2);
    const end=runtime.update(1000+durationMs);
    expect(end.status).toBe('complete');expect(end.elapsedMs).toBe(durationMs);
    expect(end.speedMps).toBe(0);
  });
  it('excludes paused time and calculates metrics at pause and stop',()=>{
    const r=new ActivityRuntime();r.start(0);r.pause(1000);
    expect(r.getSnapshot().elapsedMs).toBe(12000);
    expect(r.getSnapshot().distanceM).toBeCloseTo(38.4);
    r.update(100000);r.resume(100000);r.stop(101000);
    expect(r.getSnapshot().elapsedMs).toBe(24000);
    expect(r.getSnapshot().distanceM).toBeCloseTo(76.8);
  });
  it('ignores duplicate start and does not expose mutable internal state',()=>{
    const r=new ActivityRuntime();r.start(0);r.start(1000);
    expect(r.update(2000).elapsedMs).toBe(24000);
    const s=r.getSnapshot();s.distanceM=9999;
    expect(r.getSnapshot().distanceM).not.toBe(9999);
    r.reset();expect(r.getSnapshot().status).toBe('ready');
  });
  it('reaches the exact last geographic coordinate and uses distance interpolation',()=>{
    expect(sampleRoute(0).lng).toBe(route[0].lng);
    expect(sampleRoute(1).lng).toBeCloseTo(route.at(-1)!.lng,10);
    expect(sampleRoute(1).lat).toBeCloseTo(route.at(-1)!.lat,10);
    expect(sampleRoute(0.5).segment).toBeGreaterThan(1);
  });
});
