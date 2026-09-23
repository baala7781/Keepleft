'use client';
import {useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense} from 'react';
import {ArrowUpLeft, Download, Footprints, Play, RefreshCw, Trash2, Mountain,House,ChartNoAxesColumn,Compass,Share2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {createActivityStore} from '@/lib/native/platform';
import {type ActivityStore,type ActivitySummary, type SavedActivity, routeGeoJSON} from '@/lib/tracking/storage';
import type {AcceptedFix} from '@/lib/tracking/location';
import {formatActivityTime, activityStats} from '@/lib/tracking/activity-stats';
import {downloadRoute} from './activity-library';
import {RoutePortrait} from './route-portrait';
import {displayPlace} from '@/lib/geodata/display-place';
const StoryStudio=lazy(()=>import('./story-studio').then(m=>({default:m.StoryStudio})));

function HistoryThumbnail({id,store}:{id:string;store:ActivityStore}){
  const host=useRef<HTMLSpanElement>(null),[samples,setSamples]=useState<AcceptedFix[]>([]);
  useEffect(()=>{
    const element=host.current;if(!element)return;
    let active=true,requested=false;
    const load=()=>{if(requested)return;requested=true;void store.get(id).then(activity=>{if(active)setSamples(activity?.samples||[]);}).catch(()=>{});};
    if(!('IntersectionObserver' in window)){load();return()=>{active=false;};}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){load();observer.disconnect();}},{rootMargin:'200px'});
    observer.observe(element);return()=>{active=false;observer.disconnect();};
  },[id,store]);
  return <span ref={host} className="kl-history-thumb" aria-hidden="true">{samples.length?<RoutePortrait samples={samples}/>:<Mountain size={23}/>}</span>;
}

const summaryPace=(activity:ActivitySummary)=>activity.snapshot.distanceM>=100&&activity.snapshot.elapsedMs>0?
  `${Math.floor(activity.snapshot.elapsedMs/1000/(activity.snapshot.distanceM/1000)/60)}:${Math.floor(activity.snapshot.elapsedMs/1000/(activity.snapshot.distanceM/1000)%60).toString().padStart(2,'0')} /km`:'—';

export function KeepleftHome({onOpen,onStats}: {onOpen?: (activity?: SavedActivity) => void;onStats?:()=>void}) {
  const store = useRef<ReturnType<typeof createActivityStore> | null>(null);
  if (!store.current) store.current = createActivityStore();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [latest, setLatest] = useState<SavedActivity>();
  const [selected, setSelected] = useState<SavedActivity>();
  const [story,setStory]=useState<SavedActivity>();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const entries = (await store.current!.list()).sort((a,b) => b.startedAtMs - a.startedAtMs);
      setActivities(entries);
      setLatest(entries.length ? await store.current!.get(entries[0].id) : undefined);
    } catch { setMessage('Your saved runs could not be loaded. Try refreshing.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const totals = useMemo(() => activities.reduce((sum, run) => ({
    distance: sum.distance + run.snapshot.distanceM,
    time: sum.time + run.snapshot.elapsedMs,
    longest: Math.max(sum.longest, run.snapshot.distanceM),
  }), {distance: 0, time: 0, longest: 0}), [activities]);
  const earlierActivities=activities.slice(1);
  const open = (activity?: SavedActivity) => {
    if (onOpen) onOpen(activity);
    else window.location.assign(activity ? '/run?activity=' + encodeURIComponent(activity.id) : '/run');
  };
  const inspect = async (id: string) => {
    setBusy(true);
    try {
      const record = await store.current!.get(id);
      if (!record) throw new Error();
      setSelected(record); setDeleting(false);
    } catch { setMessage('That run could not be opened. Refresh your saved runs and try again.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await store.current!.remove(selected.id);
      setSelected(undefined); setDeleting(false);
      await refresh(); setMessage('Run deleted from this device.');
    } catch { setMessage('Could not delete this run. Please try again.'); }
    finally { setBusy(false); }
  };
  const stats = selected ? activityStats(selected) : undefined;
  return <main className="kl-home">
    <header className="kl-home-header">
      <div className="kl-home-brand"><a className="kl-wordmark" href="/" aria-label="Keepleft home"><ArrowUpLeft aria-hidden="true"/><span>KeepLeft</span></a><small>Same roads. A clearer you.</small></div>
      <Button className="kl-start" onClick={() => open()}><Footprints/><span className="kl-start-wide">Start a run</span><span className="kl-start-short">Start</span></Button>
    </header>
    <div className="kl-home-body">
      <section className="kl-journey" aria-labelledby="journey-title">
        <div className="kl-journey-copy">
          <span className="kl-section-label">{latest ? 'Your last journey' : 'Your next journey'}</span>
          <h1 id="journey-title">{latest ? displayPlace(latest.placeName,'Your outdoor run') : 'Your next run starts here.'}</h1>
          <p>{latest ? new Date(latest.startedAtMs).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}) : 'Run your route. Come back and see it in motion.'}</p>
          {latest ? <>
            <div className="kl-journey-distance"><strong>{(latest.snapshot.distanceM / 1000).toFixed(2)}</strong><span>km travelled</span></div>
            <Button className="kl-action" onClick={() => open(latest)} disabled={!latest.samples.length}><Play/>Replay this run</Button>
            <Button className="kl-social-post" variant="outline" onClick={()=>setStory(latest)} disabled={!latest.samples.length}><Share2/>Create social post</Button>
          </> : <Button variant="outline" onClick={() => open()}><Mountain/>Open the world</Button>}
        </div>
        <div className="kl-journey-portrait">
          {loading ? <p role="status">Loading your last run…</p> : latest?.samples.length ? <RoutePortrait samples={latest.samples}/> : <div className="kl-empty-route" aria-hidden="true"><Mountain/></div>}
        </div>
      </section>
      <div className="kl-section-heading"><div><span className="kl-section-label">All-time · this device</span><h2>Your totals</h2></div><small>{activities.length} saved {activities.length===1?'activity':'activities'}</small></div>
      <section id="run-stats" className="kl-athlete-strip" aria-label="All-time activity totals">
        <div><span>Distance covered</span><strong>{(totals.distance / 1000).toFixed(1)} <small>km</small></strong></div>
        <div><span>Time outside</span><strong>{formatActivityTime(totals.time)}</strong></div>
        <div><span>Runs saved</span><strong>{activities.length}</strong></div>
        <div><span>Longest run</span><strong>{(totals.longest / 1000).toFixed(1)} <small>km</small></strong></div>
      </section>
      <section id="journal" className="kl-journal" aria-labelledby="journal-title" aria-busy={loading}>
        <div className="kl-journal-heading"><h2 id="journal-title">Earlier activities</h2><Button variant="ghost" aria-label="Refresh saved runs" disabled={loading || busy} onClick={() => void refresh()}><RefreshCw size={18}/></Button></div>
        <p className="kl-storage-caption">Saved on this device. Export a backup before clearing app data.</p>
        {message && <p className="kl-feedback" role="status">{message}</p>}
        {loading ? <div className="kl-history-loading" role="status">Loading your journeys…</div> : earlierActivities.length ? <ol className="kl-history">
          {earlierActivities.map(activity => <li key={activity.id}>
            <button className="kl-history-row" disabled={busy} onClick={() => void inspect(activity.id)}>
              <span className="kl-history-date"><strong>{new Date(activity.startedAtMs).getDate()}</strong><span>{new Date(activity.startedAtMs).toLocaleDateString(undefined,{month:'short',year:'numeric'})}</span></span>
              <HistoryThumbnail id={activity.id} store={store.current!}/>
              <span className="kl-history-name"><strong>{displayPlace(activity.placeName,'Outdoor run')}</strong><span>{activity.activityType==='cycle'?'Outdoor ride':activity.activityType==='walk'?'Outdoor walk':'Outdoor run'} · {formatActivityTime(activity.snapshot.elapsedMs)} · {activity.activityType==='cycle'?`${(activity.snapshot.elapsedMs>0?activity.snapshot.distanceM/(activity.snapshot.elapsedMs/1000)*3.6:0).toFixed(1)} km/h`:summaryPace(activity)}</span></span>
              <span className="kl-history-distance">{(activity.snapshot.distanceM / 1000).toFixed(2)} <small>km</small></span>
              <Play size={18} aria-hidden="true"/>
            </button>
          </li>)}
        </ol> : <div className="kl-history-empty"><p>{activities.length?'No earlier activities yet.':'No saved activities yet.'}</p><span>{activities.length?'Your next completed activity will appear here.':'Your completed activities will appear here, ready to replay.'}</span></div>}
      </section>
      <footer className="kl-home-footer" style={{padding:'24px 0 16px',textAlign:'center',fontSize:'0.75rem',color:'#666',display:'flex',justifyContent:'center',gap:'16px'}}>
        <a href="/about" style={{color:'#888',textDecoration:'none'}}>About &amp; Licenses</a>
        <span aria-hidden="true">·</span>
        <a href="/privacy" style={{color:'#888',textDecoration:'none'}}>Privacy Policy</a>
      </footer>
    </div>
    <nav className="kl-bottom-nav" aria-label="Main navigation"><a href="/" aria-current="page"><House/>Home</a>{onStats?<button onClick={onStats}><ChartNoAxesColumn/>Stats</button>:<a href="/stats"><ChartNoAxesColumn/>Stats</a>}<button onClick={()=>open()}><Compass/>Explore</button></nav>
    <Dialog open={!!selected} onOpenChange={value => { if (!value && !busy) {setSelected(undefined); setDeleting(false);} }}>
      {selected && stats && <DialogContent className="kl-run-detail" showCloseButton={!busy}>
        <DialogHeader><DialogTitle>{deleting ? 'Delete this run?' : displayPlace(selected.placeName,'Outdoor run')}</DialogTitle><DialogDescription>{deleting ? 'This removes the recording from this device. Export a backup first if you want to keep it.' : new Date(selected.startedAtMs).toLocaleString()}</DialogDescription></DialogHeader>
        {deleting ? <div className="kl-detail-actions"><Button variant="outline" disabled={busy} onClick={() => setDeleting(false)}>Keep run</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete run'}</Button></div> : <>
          <RoutePortrait samples={selected.samples}/>
          <div className="kl-detail-stats"><div><span>Distance</span><strong>{stats.distanceKm.toFixed(2)} km</strong></div><div><span>Time</span><strong>{stats.activeTime}</strong></div><div><span>{selected.activityType==='cycle'?'Average speed':'Average pace'}</span><strong>{selected.activityType==='cycle'?`${stats.averageSpeedKph.toFixed(1)} km/h`:stats.averagePace}</strong></div></div>
          <Button variant="outline" disabled={!selected.samples.length} onClick={()=>{setStory(selected);setSelected(undefined);}}><Share2/>Create social post</Button>
          <div className="kl-detail-actions"><Button className="kl-action" disabled={!selected.samples.length} onClick={() => open(selected)}><Play/>Replay run</Button><Button variant="outline" onClick={() => {downloadRoute(routeGeoJSON(selected.samples,selected.snapshot));setMessage('Route export opened.');}}><Download/>Export</Button><Button variant="ghost" aria-label="Delete run" onClick={() => setDeleting(true)}><Trash2/></Button></div>
        </>}
        {message&&<p className="kl-feedback" role="status">{message}</p>}
      </DialogContent>}
    </Dialog>
    {story&&<Suspense fallback={<div className="atlas-loading" role="status">Opening your story…</div>}><StoryStudio activity={story} onClose={()=>setStory(undefined)}/></Suspense>}
  </main>;
}
