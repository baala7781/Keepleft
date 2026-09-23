import type {ActivityType} from './location';

export type ActivityProfile={maxSpeedMps:number;spikeSpeedMps:number;jitterFloorM:number;jitterCeilingM:number;
  jitterAccuracyFactor:number;preloadTiles:number;cameraFollowRate:number;speedWindowMs:number};

/** Conservative safety gates, not claims about an athlete's performance. */
export const activityProfiles:Record<ActivityType,ActivityProfile>={
  walk:{maxSpeedMps:9,spikeSpeedMps:4,jitterFloorM:3,jitterCeilingM:25,jitterAccuracyFactor:.5,preloadTiles:1,cameraFollowRate:2.8,speedWindowMs:8000},
  run:{maxSpeedMps:15,spikeSpeedMps:6,jitterFloorM:3,jitterCeilingM:25,jitterAccuracyFactor:.5,preloadTiles:2,cameraFollowRate:2.8,speedWindowMs:8000},
  cycle:{maxSpeedMps:28,spikeSpeedMps:24,jitterFloorM:3,jitterCeilingM:25,jitterAccuracyFactor:.5,preloadTiles:3,cameraFollowRate:4.5,speedWindowMs:8000},
};

export const gpsQualityThresholds={goodM:20,fairM:35,recordableM:50,mapAreaM:1000,staleMs:30000} as const;
export const webLocationOptions:PositionOptions={enableHighAccuracy:true,maximumAge:0,timeout:15000};
