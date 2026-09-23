import {describe,it,expect,vi} from 'vitest';
import {AndroidActivityRuntime} from './runtime';
import {AndroidActivityStore} from './storage';
import type {NativeBridge,NativeRunState} from './bridge';
import {initialSnapshot} from '../tracking/activity';
import {ReplayRuntime} from '../tracking/replay';

const point=(n:number)=>({lng:0,lat:n*.0001,accuracyM:5,timestampMs:1000+n*5000,activeElapsedMs:n*5000,breakBefore:n===0});
function frame(status:'recording'|'paused'|'complete'='recording',count=1):NativeRunState{
  return {source:'gps',activity:{version:1,id:'synthetic-run',source:'gps',startedAtMs:1000,endedAtMs:status==='complete'?16000:0,snapshot:{...initialSnapshot,status,elapsedMs:15000,distanceM:22}},samples:Array.from({length:count},(_,i)=>point(i)),sampleCount:count,fix:point(count-1),mapFix:point(count-1),locationState:'ready',message:'Synthetic state'};
}
function fixture(state=frame()){
  const bridge={state:vi.fn().mockResolvedValue(state),command:vi.fn().mockResolvedValue(state),list:vi.fn().mockResolvedValue({activities:[]}),get:vi.fn(),save:vi.fn().mockResolvedValue(undefined),remove:vi.fn().mockResolvedValue(undefined),getMap:vi.fn(),putMap:vi.fn(),exportRoute:vi.fn()} satisfies NativeBridge;
  return {bridge,runtime:new AndroidActivityRuntime(bridge)};
}
const settled=()=>new Promise(resolve=>setTimeout(resolve,0));

describe('Android capture bridge',()=>{
  it('sends the selected activity type to native capture and restores it on restart',async()=>{
    const ready={source:'gps' as const,samples:[],sampleCount:0,locationState:'ready' as const,message:''};
    const {runtime,bridge}=fixture(ready);runtime.subscribe(()=>{});await settled();
    runtime.setActivityType('cycle');runtime.start();await settled();
    expect(bridge.command).toHaveBeenLastCalledWith({action:'start',value:'cycle'});runtime.dispose();
    const state=frame('paused',3);state.activity!.activityType='cycle';
    const restored=fixture(state);restored.runtime.subscribe(()=>{});await settled();
    expect(restored.runtime.activityType).toBe('cycle');restored.runtime.setActivityType('walk');
    expect(restored.runtime.activityType).toBe('cycle');restored.runtime.dispose();
  });
  it('does not overwrite a new activity selection when polling the previous completed run',async()=>{
    const state=frame('complete',3);state.activity!.activityType='walk';
    const {runtime,bridge}=fixture(state);runtime.subscribe(()=>{});await settled();
    runtime.setActivityType('cycle');runtime.update(performance.now()+2000);await settled();
    expect(runtime.activityType).toBe('cycle');runtime.start();await settled();
    expect(bridge.command).toHaveBeenLastCalledWith({action:'start',value:'cycle'});runtime.dispose();
  });
  it('does not animate rejected jitter beyond the last accepted recorded point',async()=>{
    const state=frame('recording',3);state.fix={...point(2),lng:.0002,timestampMs:Date.now()};
    const {runtime}=fixture(state);runtime.subscribe(()=>{});await settled();
    expect(runtime.getMotion()?.lng).toBe(point(2).lng);
    expect(runtime.getMotion()?.lat).toBe(point(2).lat);
    expect(runtime.getTrail().at(-1)).toMatchObject({sampleKey:point(2).timestampMs});
    expect(runtime.currentFix?.lng).toBe(.0002);runtime.dispose();
  });
  it('prepares location once on a fresh launch without replacing a saved session',async()=>{
    const {bridge,runtime}=fixture({source:'demo',samples:[],sampleCount:0,locationState:'idle',message:''});
    runtime.subscribe(()=>{});await settled();expect(bridge.command).toHaveBeenCalledWith({action:'prepare',value:undefined});
    runtime.update(performance.now()+2000);await settled();expect(bridge.command).toHaveBeenCalledTimes(1);runtime.dispose();
    const saved=fixture(frame('complete'));saved.runtime.subscribe(()=>{});await settled();expect(saved.bridge.command).not.toHaveBeenCalled();saved.runtime.dispose();
  });
  it('restores native capture, merges only new samples, and can replay a completed route',async()=>{
    const {bridge,runtime}=fixture();runtime.subscribe(()=>{});await settled();
    expect(runtime.getSnapshot().status).toBe('recording');
    bridge.state.mockResolvedValue({...frame('recording',3),samples:[point(1),point(2)]});
    runtime.update(2000);await settled();
    expect(bridge.state).toHaveBeenLastCalledWith({id:'synthetic-run',after:1});
    expect(runtime.getTrail()).toHaveLength(3);
    bridge.command.mockResolvedValue(frame('complete',3));runtime.stop();await settled();
    const saved=runtime.completedActivity()!;expect(saved.samples).toHaveLength(3);
    expect(new ReplayRuntime(saved).getSnapshot().status).toBe('paused');
    runtime.dispose();
  });
  it('does not stop native capture when the renderer/UI is disposed',async()=>{
    const {runtime,bridge}=fixture(frame('paused',2));runtime.subscribe(()=>{});await settled();
    expect(runtime.getSnapshot().status).toBe('paused');
    runtime.dispose();runtime.update(9000);expect(bridge.command).not.toHaveBeenCalled();
    expect(bridge.state).toHaveBeenCalledTimes(1);
  });
  it('keeps command errors visible even after a status refresh',async()=>{
    const {runtime,bridge}=fixture({source:'demo',samples:[],sampleCount:0,locationState:'idle',message:''});
    bridge.command.mockRejectedValue(new Error('Allow precise location and retry.'));
    runtime.enableLocation();await settled();expect(runtime.busy).toBe(false);
    runtime.update(performance.now()+2000);await settled();
    expect(runtime.actionError).toBe('Allow precise location and retry.');runtime.dispose();
  });
  it('does not abandon a native run if switching to demo is rejected',async()=>{
    const {runtime,bridge}=fixture();runtime.subscribe(()=>{});await settled();
    bridge.command.mockRejectedValue(new Error('Stop your current run first.'));
    runtime.useDemo();await settled();expect(runtime.source).toBe('gps');
    expect(runtime.getSnapshot().status).toBe('recording');runtime.dispose();
  });
  it('serializes user actions and delegates durable storage to Android',async()=>{
    const {runtime,bridge}=fixture();runtime.subscribe(()=>{});await settled();
    let finish!:(state:NativeRunState)=>void;
    bridge.command.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    runtime.pause();runtime.pause();expect(runtime.busy).toBe(true);expect(bridge.command).toHaveBeenCalledTimes(1);
    finish(frame('paused'));await settled();expect(runtime.getSnapshot().status).toBe('paused');
    const store=new AndroidActivityStore(bridge);await store.remove('synthetic-run');expect(bridge.remove).toHaveBeenCalledWith({id:'synthetic-run'});
    runtime.dispose();
  });
});
