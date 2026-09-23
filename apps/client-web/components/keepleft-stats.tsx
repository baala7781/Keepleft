'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ChartNoAxesColumn,Compass,House,Footprints,Bike,PersonStanding} from 'lucide-react';
import {createActivityStore} from '@/lib/native/platform';
import type {ActivitySummary} from '@/lib/tracking/storage';
import {athleteStats} from '@/lib/tracking/athlete-stats';
import {formatActivityTime} from '@/lib/tracking/activity-stats';

const pace=(seconds:number|null)=>seconds!==null&&Number.isFinite(seconds)&&seconds<=3600?
  `${Math.floor(seconds/60)}:${Math.floor(seconds%60).toString().padStart(2,'0')} /km`:'—';
const activityIcon=(type:string)=>type==='cycle'?<Bike size={16}/>:type==='walk'?<PersonStanding size={16}/>:<Footprints size={16}/>;
const activityLabel=(type:string)=>type==='cycle'?'Outdoor ride':type==='walk'?'Outdoor walk':'Outdoor run';

export function KeepleftStats({onHome,onExplore}:{onHome?:()=>void;onExplore?:()=>void}={}){
  const store=useMemo(()=>createActivityStore(),[]);
  const [activities,setActivities]=useState<ActivitySummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let alive=true;void store.list().then(items=>{if(alive)setActivities(items);}).catch(()=>{if(alive)setError('Stats could not load from this device.');}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[store]);
  const data=useMemo(()=>athleteStats(activities),[activities]);
  const max=Math.max(1000,...data.days.map(day=>day.distanceM));
  const historyMax=Math.max(1000,...data.historyDays.map(day=>day.distanceM));
  const trend=data.trend;
  const minPace=Math.min(...trend.map(point=>point.secondsPerKm),300),maxPace=Math.max(...trend.map(point=>point.secondsPerKm),420);
  const line=trend.length>=2?trend.map((point,index)=>`${24+index*352/(trend.length-1)},${144-(point.secondsPerKm-minPace)/Math.max(1,maxPace-minPace)*104}`).join(' '):'';
  return <main className="kl-stats-page">
    <header className="kl-stats-header">{onHome?<button type="button" className="kl-stats-back" onClick={onHome} aria-label="Back to home"><ArrowLeft/></button>:<a className="kl-stats-back" href="/" aria-label="Back to home"><ArrowLeft/></a>}<div><span className="kl-settings-eyebrow">KeepLeft / Your movement</span><h1>Stats</h1></div></header>
    <div className="kl-stats-layout" aria-busy={loading}>
      <section className="kl-stats-panel kl-stats-distance" aria-labelledby="weekly-distance-title">
        <span className="kl-settings-eyebrow">Last seven days</span><h2 id="weekly-distance-title">Distance</h2>
        <div className="kl-stats-headline"><strong>{(data.weekDistanceM/1000).toFixed(1)}<small> km</small></strong>
          <span>{data.weekChangePercent===null?'No previous-week comparison':`${data.weekChangePercent>=0?'+':''}${data.weekChangePercent}% vs previous week`}</span></div>
        {data.weekDistanceM>0?<svg className="kl-stats-bars" viewBox="0 0 420 184" aria-label="Distance by day for the last seven days">
          <line x1="12" x2="408" y1="150" y2="150" stroke="#424246"/>
          {data.days.map((day,index)=>{const x=22+index*57,height=day.distanceM/max*124;return <g key={day.key}><rect x={x} y={150-Math.max(day.distanceM?4:0,height)} width="28" height={Math.max(day.distanceM?4:0,height)} rx="3" fill={day.distanceM?'#f33b53':'#303135'}/><text x={x+14} y="174" textAnchor="middle">{day.label}</text></g>;})}
        </svg>:<p className="kl-stats-empty-week">Your next activity starts this chart.</p>}
        <p>{data.activeThisWeek} {data.activeThisWeek===1?'activity':'activities'} this week</p>
      </section>
      <section className="kl-stats-panel kl-stats-frequency" aria-labelledby="activity-title"><span className="kl-settings-eyebrow">Last 12 weeks</span><h2 id="activity-title">Days you moved</h2>
        <div className="kl-history-heatmap" role="img" aria-label={`${data.historyDays.filter(day=>day.count).length} active days in the last 12 weeks`}>
          {data.historyDays.map(day=>{const level=day.distanceM?Math.max(1,Math.min(4,Math.ceil(day.distanceM/historyMax*4))):0;return <i key={day.key} data-level={level} title={`${new Date(day.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}: ${day.count?`${day.count} activit${day.count===1?'y':'ies'}, ${(day.distanceM/1000).toFixed(1)} km`:'Rest day'}`}/>;})}
        </div>
        <div className="kl-heatmap-legend"><span>Rest</span>{[0,1,2,3,4].map(level=><i key={level} data-level={level}/>)}<span>Longer</span></div>
        <p>{data.count?`${data.count} saved activities · ${data.historyDays.filter(day=>day.count).length} active days shown`:'Your completed activities will build this history.'}</p>
      </section>
      <section className="kl-stats-panel kl-stats-pace" aria-labelledby="pace-trend-title"><span className="kl-settings-eyebrow">Walk + run</span><h2 id="pace-trend-title">Pace trend</h2>
        <div className="kl-stats-headline"><strong>{pace(data.movementPaceSeconds)}</strong><span>overall average</span></div>
        {trend.length>=2?<svg viewBox="0 0 400 170" className="kl-stats-line" aria-label={`Pace trend across ${trend.length} activities`}><line x1="24" x2="376" y1="144" y2="144" stroke="#424246"/><polyline points={line} fill="none" stroke="#f33b53" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{trend.map((point,index)=><circle key={point.date} cx={24+index*352/(trend.length-1)} cy={144-(point.secondsPerKm-minPace)/Math.max(1,maxPace-minPace)*104} r="4" fill="#f33b53"/>)}</svg>:<p className="kl-stats-empty">A pace trend appears after two walks or runs.</p>}
      </section>
      <section className="kl-stats-panel kl-stats-totals" aria-labelledby="totals-title"><span className="kl-settings-eyebrow">All time / this device</span><h2 id="totals-title">Totals</h2>
        <div className="kl-stats-total-grid"><div><strong>{(data.totalDistanceM/1000).toFixed(1)} km</strong><span>Distance</span></div><div><strong>{data.count}</strong><span>Activities</span></div><div><strong>{formatActivityTime(data.totalTimeMs)}</strong><span>Time outside</span></div><div><strong>{pace(data.movementPaceSeconds)}</strong><span>Walk / run pace</span></div></div>
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
    </div>
    {loading&&<output className="kl-stats-feedback">Loading stats…</output>}{error&&<p className="kl-stats-feedback" role="alert">{error}</p>}
    <footer className="kl-home-footer" style={{padding:'24px 0 16px',textAlign:'center',fontSize:'0.75rem',color:'#666',display:'flex',justifyContent:'center',gap:'16px'}}>
      <a href="/about" style={{color:'#888',textDecoration:'none'}}>About &amp; Licenses</a>
      <span aria-hidden="true">·</span>
      <a href="/privacy" style={{color:'#888',textDecoration:'none'}}>Privacy Policy</a>
    </footer>
    <nav className="kl-bottom-nav" aria-label="Main navigation">{onHome?<button type="button" onClick={onHome}><House/>Home</button>:<a href="/"><House/>Home</a>}<a href="/stats" aria-current="page"><ChartNoAxesColumn/>Stats</a>{onExplore?<button type="button" onClick={onExplore}><Compass/>Explore</button>:<a href="/run"><Compass/>Explore</a>}</nav>
  </main>;
}
