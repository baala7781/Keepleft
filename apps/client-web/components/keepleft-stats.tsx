'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ChartNoAxesColumn,Compass,House,Footprints,Bike,PersonStanding} from 'lucide-react';
import {createActivityStore} from '@/lib/native/platform';
import type {ActivitySummary} from '@/lib/tracking/storage';
import {athleteStats} from '@/lib/tracking/athlete-stats';
import {formatActivityTime} from '@/lib/tracking/activity-stats';
import {statsPeriod} from '@/lib/tracking/stats-period';

const pace=(seconds:number|null)=>seconds!==null&&Number.isFinite(seconds)&&seconds<=3600?
  `${Math.floor(seconds/60)}:${Math.floor(seconds%60).toString().padStart(2,'0')} /km`:'—';
const activityIcon=(type:string)=>type==='cycle'?<Bike size={16}/>:type==='walk'?<PersonStanding size={16}/>:<Footprints size={16}/>;
const activityLabel=(type:string)=>type==='cycle'?'Outdoor ride':type==='walk'?'Outdoor walk':'Outdoor run';

export function KeepleftStats({onHome,onExplore}:{onHome?:()=>void;onExplore?:()=>void}={}){
  const store=useMemo(()=>createActivityStore(),[]);
  const [activities,setActivities]=useState<ActivitySummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [period,setPeriod]=useState(7),[kind,setKind]=useState('all');
  useEffect(()=>{let alive=true;void store.list().then(items=>{if(alive)setActivities(items);}).catch(()=>{if(alive)setError('Stats could not load from this device.');}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[store]);
  const selected=useMemo(()=>statsPeriod(activities,period,kind,loading?new Date(2026,0,1):new Date()),[activities,period,kind,loading]);
  const data=useMemo(()=>athleteStats(selected.current,loading?new Date(2026,0,1):new Date()),[selected,loading]);
  const max=Math.max(1000,...selected.buckets.map(day=>day.distanceM));
  const historyMax=Math.max(1000,...data.historyDays.map(day=>day.distanceM));
  const trend=selected.buckets;
  const line=trend.map((point,index)=>`${24+index*352/(trend.length-1)},${144-point.distanceM/max*104}`).join(' ');
  const breakdown=['run','walk','cycle'].map((type,index)=>({type,color:['#e33b63','#f3a1b5','#aeb2b7'][index],count:selected.current.filter(item=>(item.activityType||'run')===type).length}));
  let angle=0;const slices=breakdown.map(item=>{const start=angle;angle+=data.count?item.count/data.count*360:0;return `${item.color} ${start}deg ${angle}deg`;}).join(',');
  return <main className="kl-stats-page">
    <header className="kl-stats-header">{onHome?<button type="button" className="kl-stats-back" onClick={onHome} aria-label="Back to home"><ArrowLeft/></button>:<a className="kl-stats-back" href="/" aria-label="Back to home"><ArrowLeft/></a>}<div><h1>YourLeft</h1><span className="kl-settings-eyebrow">Your movement matters</span></div><label className="kl-stats-filter"><span className="sr-only">Activity type</span><select value={kind} onChange={event=>setKind(event.target.value)}><option value="all">All activities</option><option value="run">Running</option><option value="walk">Walking</option><option value="cycle">Cycling</option></select></label></header>
    <div className="kl-period-tabs" role="group" aria-label="Stats period">{[{days:7,label:'7D'},{days:30,label:'1M'},{days:90,label:'3M'},{days:365,label:'1Y'}].map(item=><button key={item.days} type="button" aria-pressed={period===item.days} onClick={()=>setPeriod(item.days)}>{item.label}</button>)}</div>
    <div className="kl-stats-layout" aria-busy={loading}>
      <section className="kl-stats-panel kl-stats-distance" aria-labelledby="weekly-distance-title">
        <span className="kl-settings-eyebrow">Last {period} days</span><h2 id="weekly-distance-title">Total distance</h2>
        <div className="kl-stats-headline"><strong>{(selected.distanceM/1000).toFixed(1)}<small> km</small></strong>
          <span>{selected.change===null?'No previous-period comparison':`${selected.change>=0?'+':''}${selected.change}% vs previous ${period} days`}</span></div>
        {selected.distanceM>0?<svg className="kl-stats-bars" viewBox="0 0 420 184" aria-label={`Distance grouped across the last ${period} days`}>
          <line x1="12" x2="408" y1="150" y2="150" stroke="#424246"/>
          {selected.buckets.map((day,index)=>{const width=392/selected.buckets.length,x=14+index*width,height=day.distanceM/max*124;return <g key={index}><rect x={x+width*.2} y={150-Math.max(day.distanceM?4:0,height)} width={width*.6} height={Math.max(day.distanceM?4:0,height)} rx="3" fill={day.distanceM?'#e33b63':'#303135'}/>{(selected.buckets.length<9||index%2===0)&&<text x={x+width/2} y="174" textAnchor="middle">{day.label}</text>}</g>;})}
        </svg>:<p className="kl-stats-empty-week">Your next activity starts this chart.</p>}
        <p>{data.count} {data.count===1?'activity':'activities'} in this period</p>
      </section>
      <section className="kl-stats-panel kl-stats-frequency" aria-labelledby="activity-title"><span className="kl-settings-eyebrow">Selected activities · last 12 weeks</span><h2 id="activity-title">Days you moved</h2>
        <div className="kl-history-heatmap" role="img" aria-label={`${data.historyDays.filter(day=>day.count).length} active days in the last 12 weeks`}>
          {data.historyDays.map(day=>{const level=day.distanceM?Math.max(1,Math.min(4,Math.ceil(day.distanceM/historyMax*4))):0;return <i key={day.key} data-level={level} title={`${new Date(day.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}: ${day.count?`${day.count} activit${day.count===1?'y':'ies'}, ${(day.distanceM/1000).toFixed(1)} km`:'Rest day'}`}/>;})}
        </div>
        <div className="kl-heatmap-legend"><span>Rest</span>{[0,1,2,3,4].map(level=><i key={level} data-level={level}/>)}<span>Longer</span></div>
        <p>{data.count?`${data.count} saved activities · ${data.historyDays.filter(day=>day.count).length} active days shown`:'Your completed activities will build this history.'}</p>
      </section>
      <section className="kl-stats-panel kl-stats-pace" aria-labelledby="pace-trend-title"><h2 id="pace-trend-title">Distance trend</h2>
        {data.count?<svg viewBox="0 0 400 180" className="kl-stats-line" role="img" aria-label={`Distance in kilometres across the last ${period} days`}>
          {[0,1,2].map(level=><g key={level}><line x1="24" x2="376" y1={144-level*52} y2={144-level*52} stroke="#292d30"/><text x="0" y={148-level*52} fontSize="10" fill="#a8aaae">{(max/1000*level/2).toFixed(1)}</text></g>)}
          <polygon points={`24,144 ${line} 376,144`} fill="#e33b63" opacity=".1"/><polyline points={line} fill="none" stroke="#e33b63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>{trend.map((point,index)=><g key={index}><circle cx={24+index*352/(trend.length-1)} cy={144-point.distanceM/max*104} r="3.5" fill="#e33b63"/><title>{point.label}: {(point.distanceM/1000).toFixed(2)} km</title>{(trend.length<9||index%2===0)&&<text x={24+index*352/(trend.length-1)} y="173" textAnchor="middle" fontSize="9" fill="#a8aaae">{point.label}</text>}</g>)}</svg>:<p className="kl-stats-empty">Complete an activity to see your distance trend.</p>}
      </section>
      <section className="kl-stats-panel kl-stats-totals" aria-labelledby="totals-title"><span className="kl-settings-eyebrow">Last {period} days</span><h2 id="totals-title">Period totals</h2>
        <div className="kl-stats-total-grid"><div><strong>{formatActivityTime(data.totalTimeMs)}</strong><span>Total time</span></div><div><strong>{kind==='cycle'?(data.totalTimeMs>0?data.totalDistanceM/data.totalTimeMs*3600:0).toFixed(1):pace(data.movementPaceSeconds)}</strong><span>{kind==='cycle'?'Avg. km/h':'Walk / run pace'}</span></div><div><strong>{data.count}</strong><span>Activities</span></div></div>
      </section>
      <section className="kl-stats-panel kl-stats-history" aria-labelledby="history-title">
        <span className="kl-settings-eyebrow">Your activities</span><h2 id="history-title">Activity log</h2>
        {data.recentActivities.length?<ol className="kl-activity-log">{data.recentActivities.map(group=><li key={group.dateMs}>
          <h3 className="kl-log-date">{group.dateLabel}</h3>
          <ul>{group.entries.map(entry=><li key={entry.id} className="kl-log-entry">
            <span className="kl-log-icon" aria-label={activityLabel(entry.activityType)}>{activityIcon(entry.activityType)}</span>
            <span className="kl-log-name"><strong>{activityLabel(entry.activityType)}</strong><span>{new Date(entry.startedAtMs).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span></span>
            <span className="kl-log-metric">{(entry.distanceM/1000).toFixed(2)} <small>km</small></span>
            <span className="kl-log-metric">{formatActivityTime(entry.elapsedMs)}</span>
            <span className="kl-log-metric">{entry.activityType==='cycle'?`${entry.speedKph.toFixed(1)} km/h`:pace(entry.paceSeconds)}</span>
          </li>)}</ul>
        </li>)}</ol>:<p className="kl-stats-empty">Your completed activities will appear here, grouped by date.</p>}
      </section>
      <section className="kl-stats-panel kl-stats-breakdown" aria-labelledby="breakdown-title"><h2 id="breakdown-title">Activity type breakdown</h2><div className="kl-breakdown-content"><div className="kl-breakdown-ring" style={{background:data.count?`conic-gradient(${slices})`:'#303338'}} aria-hidden="true"><div><strong>{data.count}</strong><span>Activities</span></div></div><ul>{breakdown.map(item=><li key={item.type}><i style={{background:item.color}}/><span>{item.type==='cycle'?'Cycle':item.type==='walk'?'Walk':'Run'}</span><strong>{item.count}</strong><small>{data.count?Math.round(item.count/data.count*100):0}%</small></li>)}</ul></div></section>
    </div>
    {loading&&<output className="kl-stats-feedback">Loading stats…</output>}{error&&<p className="kl-stats-feedback" role="alert">{error}</p>}
    <footer className="kl-home-footer" style={{padding:'24px 0 16px',textAlign:'center',fontSize:'0.75rem',color:'#666',display:'flex',justifyContent:'center',gap:'16px'}}>
      <a href="/terms" style={{color:'#888',textDecoration:'none'}}>Terms</a>
      <a href="/about" style={{color:'#888',textDecoration:'none'}}>About &amp; Licenses</a>
      <span aria-hidden="true">·</span>
      <a href="/privacy" style={{color:'#888',textDecoration:'none'}}>Privacy Policy</a>
    </footer>
    <nav className="kl-bottom-nav" aria-label="Main navigation">{onHome?<button type="button" onClick={onHome}><House/>Home</button>:<a href="/"><House/>Home</a>}<a href="/stats" aria-current="page"><ChartNoAxesColumn/>Stats</a>{onExplore?<button type="button" onClick={onExplore}><Compass/>Explore</button>:<a href="/run"><Compass/>Explore</a>}</nav>
  </main>;
}
