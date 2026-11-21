import {afterEach,it,expect,vi} from 'vitest';
import {ActivityRuntime} from './activity';
import {SyntheticLocationProvider} from './location';

afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});

function clock(){
  let elapsed=0;const epoch=1700000000000;
  vi.spyOn(Date,'now').mockImplementation(()=>epoch+elapsed);
  vi.spyOn(performance,'now').mockImplementation(()=>elapsed);
  return {epoch,set:(ms:number)=>{elapsed=ms;}};
}

it('starts from the fresh position, not the point where the app was opened',()=>{
  const c=clock();const provider=new SyntheticLocationProvider(),runtime=new ActivityRuntime();
  runtime.enableLocation(provider);
  const A={lng:-.12,lat:51.5,accuracyM:5,timestampMs:c.epoch};
  provider.emit(A);
  // The user walks for 10 s without tapping Start. The last preview fix is still A.
  c.set(10000);
  runtime.start();
  expect(runtime.getSnapshot().status).toBe('ready');
  const B={lng:-.1198,lat:51.5001,accuracyM:5,timestampMs:c.epoch+10000};
  provider.emit(B);
  expect(runtime.getSnapshot().status).toBe('recording');
  const first=runtime.getTrail()[0];
  expect(first.lat).toBeCloseTo(B.lat,6);
  expect(first.lng).toBeCloseTo(B.lng,6);
});

it('gives up with a clear message when no fresh fix arrives within 3 s',()=>{
  vi.useFakeTimers();
  const c=clock();const provider=new SyntheticLocationProvider(),runtime=new ActivityRuntime();
  runtime.enableLocation(provider);
  provider.emit({lng:-.12,lat:51.5,accuracyM:5,timestampMs:c.epoch});
  c.set(10000);runtime.start();
  expect(runtime.getSnapshot().status).toBe('ready');
  vi.advanceTimersByTime(3000);
  expect(runtime.getSnapshot().status).toBe('ready');
  expect(runtime.getSnapshot().elapsedMs).toBe(0);
});

it('starts immediately when the current fix is already fresh',()=>{
  const c=clock();const provider=new SyntheticLocationProvider(),runtime=new ActivityRuntime();
  runtime.enableLocation(provider);
  provider.emit({lng:-.12,lat:51.5,accuracyM:5,timestampMs:c.epoch});
  runtime.start();
  expect(runtime.getSnapshot().status).toBe('recording');
});
