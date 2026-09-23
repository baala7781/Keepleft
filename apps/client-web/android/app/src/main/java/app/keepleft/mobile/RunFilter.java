package app.keepleft.mobile;

/** Pure, deterministic filter. Original accepted fixes are never snapped to roads. */
final class RunFilter {
    private final double maximumSpeed,spikeSpeed;
    RunFilter(){this("run");}
    RunFilter(String activityType){
        if(!activityType.equals("walk")&&!activityType.equals("run")&&!activityType.equals("cycle"))throw new IllegalArgumentException("Invalid activity type");
        maximumSpeed=activityType.equals("cycle")?28:activityType.equals("walk")?9:15;
        spikeSpeed=activityType.equals("cycle")?24:activityType.equals("walk")?4:6;
    }
    static final class Fix {
        final double lng, lat, accuracy;
        final long time;
        Fix(double lng,double lat,double accuracy,long time){this.lng=lng;this.lat=lat;this.accuracy=accuracy;this.time=time;}
    }
    static final class Result {
        final boolean accepted, discontinuity;
        final double distance;
        final String reason;
        Result(boolean accepted,boolean discontinuity,double distance,String reason){this.accepted=accepted;this.discontinuity=discontinuity;this.distance=distance;this.reason=reason;}
    }
    private Fix anchor;
    private long lastTime;
    private boolean discontinuity=true;
    private double speedEstimate;
    private Fix pending;
    void resetSegment(){anchor=null;discontinuity=true;speedEstimate=0;pending=null;}
    Result ingest(Fix f,long now){
        if(!Double.isFinite(f.lng)||!Double.isFinite(f.lat)||!Double.isFinite(f.accuracy)||Math.abs(f.lat)>90||Math.abs(f.lng)>180||f.accuracy<=0)return reject("invalid");
        if(f.time<=lastTime)return reject("duplicate");
        if(f.time>now+5000||now-f.time>30000)return reject("stale");
        if(f.accuracy>50)return reject("accuracy");
        double seconds=anchor==null?0:(f.time-anchor.time)/1000.0;
        double distance=anchor==null?0:distance(anchor,f);
        boolean gap=anchor!=null&&seconds>20;
        if(anchor!=null&&!gap&&anchor.accuracy>=f.accuracy*2&&distance<=anchor.accuracy){anchor=f;lastTime=f.time;discontinuity=false;pending=null;speedEstimate=0;return new Result(true,true,0,"refinement");}
        if(anchor!=null&&!gap&&distance/Math.max(.001,seconds)>maximumSpeed)return reject("jump");
        if(anchor!=null&&!gap&&distance>10&&distance/Math.max(.001,seconds)>Math.max(spikeSpeed,speedEstimate*2.5+1)){
            Fix candidate=pending;pending=f;lastTime=f.time;
            if(candidate!=null&&f.time-candidate.time<=5000&&distance(candidate,f)<=Math.max(5,Math.min(12,f.accuracy))){anchor=f;pending=null;speedEstimate=0;discontinuity=false;return new Result(true,true,0,"reacquired");}
            return reject("jump");
        }
        pending=null;
        lastTime=f.time;
        if(anchor!=null&&!gap&&distance<Math.max(3,Math.min(25,Math.max(anchor.accuracy,f.accuracy)*.5)))return reject("stationary");
        boolean broken=discontinuity||gap;speedEstimate=broken?0:speedEstimate>0?speedEstimate*.75+distance/Math.max(.001,seconds)*.25:distance/Math.max(.001,seconds);anchor=f;discontinuity=false;
        return new Result(true,broken,broken?0:distance,"accepted");
    }
    static double distance(Fix a,Fix b){
        double r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;
        double h=Math.pow(Math.sin(dLat/2),2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.pow(Math.sin(dLng/2),2);
        return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,h)));
    }
    private Result reject(String reason){return new Result(false,false,0,reason);}
}
