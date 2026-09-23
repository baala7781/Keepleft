import {useMemo} from 'react';
import type {AcceptedFix} from '@/lib/tracking/location';
import {portraitPaths} from '@/lib/tracking/route-portrait';

export function RoutePortrait({samples}: {samples: AcceptedFix[]}) {
  const paths = useMemo(() => portraitPaths(samples), [samples]);
  if (!paths.length) return <p className="kl-no-route">No route points available</p>;
  return <svg className="kl-route-portrait" viewBox="0 0 400 280" role="img" aria-label="Recorded route with separate lines for recording gaps">
    {paths.map((path,index) => <path key={index} d={path} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>)}
  </svg>;
}
