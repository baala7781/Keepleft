package app.keepleft.mobile;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Looper;
import android.os.SystemClock;
import androidx.core.content.ContextCompat;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

/** The native recorder owns all activity state; a WebView is only a reader/controller. */
final class RunEngine implements LocationListener {
    private static RunEngine instance;
    static synchronized RunEngine get(Context context){if(instance==null)instance=new RunEngine(context.getApplicationContext());return instance;}
    final RunDatabase database;
    private final Context context;
    private final LocationManager manager;
    private String source="demo",status="ready",id="",place="",locationState="idle",message="",activityType="run";
    private long startedWall,endedWall,activeMs,segmentStart,lastTimestamp,lastGoodElapsed,lastAcceptedTimestamp;
    private double distance,speed;
    private RunFilter filter=new RunFilter(),previewFilter=new RunFilter();
    private final LocationSourceGate sourceGate=new LocationSourceGate();
    private RunFilter.Fix fix,mapFix;
    private boolean listening;
    private FusedLocationProviderClient fused;
    private LocationCallback fusedCallback;
    private CancellationTokenSource currentLocation;
    private long listeningSince;
    private int locationGeneration;
    private int count;
    private RunEngine(Context context){
        this.context=context;database=new RunDatabase(context);manager=(LocationManager)context.getSystemService(Context.LOCATION_SERVICE);
        try{
            JSONObject state=database.current();if(state==null)return;
            source=state.optString("source","demo");JSONObject a=state.optJSONObject("activity");
            if(a!=null){JSONObject s=a.getJSONObject("snapshot");id=a.getString("id");startedWall=a.getLong("startedAtMs");endedWall=a.optLong("endedAtMs");place=a.optString("placeName");status=s.getString("status");activeMs=s.getLong("elapsedMs");distance=s.getDouble("distanceM");count=database.count(id);
                activityType=a.optString("activityType","run");if(!activityType.equals("walk")&&!activityType.equals("cycle"))activityType="run";
                if(status.equals("recording"))status="paused";
                JSONArray points=database.samples(id,Math.max(0,count-1));if(points.length()>0){fix=fromJSON(points.getJSONObject(0));mapFix=fix;}
                message=status.equals("paused")?"Unfinished run recovered and paused. Resume when ready.":"Saved run restored.";
                persist(null);
            }
        }catch(Exception e){message="Could not restore the last session. Saved runs remain in the library.";status="ready";id="";}
    }
    synchronized boolean active(){return status.equals("recording")||status.equals("paused");}
    synchronized boolean recording(){return status.equals("recording");}
    synchronized String status(){return status;}
    /** Reopening never prompts or overwrites a recovered run. A prior grant starts preview. */
    synchronized void prepare() throws Exception {
        if(active()||!id.isEmpty()||listening)return;
        if(ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){
            source="gps";locationState="idle";message="Enable precise location to find your starting point.";persist(null);return;
        }
        preview();
    }
    synchronized void removeSaved(String savedId) throws Exception {
        if(active())throw new IllegalStateException("Stop recording first.");
        database.remove(savedId);
        // Removing the currently displayed completed run must not resurrect it on reopen.
        if(id.equals(savedId)){id="";status="ready";count=0;activeMs=0;distance=0;speed=0;message="Run deleted.";}
    }
    synchronized void preview() throws Exception {
        if(active())throw new IllegalStateException("Pause or stop the current run first.");
        stopListening();sourceGate.reset();source="gps";status="ready";id="";place="";activeMs=0;distance=0;speed=0;count=0;fix=null;mapFix=null;lastTimestamp=0;previewFilter=new RunFilter();
        startListening();persist(null);
    }
    synchronized void start(String selectedType) throws Exception {
        if(active())return;
        RunFilter selectedFilter=new RunFilter(selectedType);
        if(fix==null||System.currentTimeMillis()-fix.time>30000||fix.accuracy>50)throw new IllegalStateException("Wait for a fresh GPS position within 50 m before starting.");
        activityType=selectedType;source="gps";id=UUID.randomUUID().toString();startedWall=System.currentTimeMillis();endedWall=0;activeMs=0;segmentStart=SystemClock.elapsedRealtime();status="recording";distance=0;speed=0;count=0;filter=selectedFilter;
        RunFilter.Result result=filter.ingest(fix,System.currentTimeMillis());JSONObject point=pointJSON(fix,result.discontinuity,0);persist(point);count++;lastAcceptedTimestamp=fix.time;
        startListening();message="Recording on this phone. You can lock the screen.";
    }
    synchronized void pause() throws Exception {
        if(!recording())return;activeMs=elapsed();status="paused";speed=0;stopListening();locationState="idle";message="Run paused. Resume when ready.";persist(null);
    }
    synchronized void resume() throws Exception {
        if(!status.equals("paused"))return;
        startListening();filter=new RunFilter(activityType);segmentStart=SystemClock.elapsedRealtime();status="recording";speed=0;message="Recording resumed. Waiting for a fresh GPS position.";persist(null);
    }
    synchronized void stop() throws Exception {
        if(!active())return;activeMs=elapsed();status="complete";endedWall=System.currentTimeMillis();speed=0;stopListening();locationState="idle";message="Run saved on this phone.";persist(null);
    }
    synchronized void demo() throws Exception {if(active())throw new IllegalStateException("Stop your current run first.");stopListening();source="demo";status="ready";id="";count=0;activeMs=0;distance=0;speed=0;fix=null;mapFix=null;place="";locationState="idle";message="";persist(null);}
    synchronized void stopPreview(){if(!active()){stopListening();locationState="idle";}}
    synchronized void place(String value) throws Exception {if(place.isEmpty()&&!value.isEmpty()){place=value.substring(0,Math.min(180,value.length()));persist(null);}}
    private long elapsed(){return activeMs+(recording()?Math.max(0,SystemClock.elapsedRealtime()-segmentStart):0);}
    private void startListening(){
        if(listening)return;
        if(ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){locationState="denied";throw new IllegalStateException("Allow precise location in Android settings to record a run.");}
        locationState="locating";message="Finding your starting point…";int providers=0;
        listeningSince=SystemClock.elapsedRealtime();final int generation=++locationGeneration;
        for(String provider:new String[]{LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER}){
            try{if(manager.isProviderEnabled(provider)){manager.requestLocationUpdates(provider,1000,0,this,Looper.getMainLooper());providers++;}}catch(IllegalArgumentException ignored){}
        }
        listening=providers>0;if(!listening){locationState="unavailable";throw new IllegalStateException("Turn on Location in Android settings and retry.");}
        // Fused location improves initial acquisition on phones with Play services. The
        // platform providers above remain independent fallbacks (including non-GMS phones).
        if(GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context)==ConnectionResult.SUCCESS){
            try{
                fused=LocationServices.getFusedLocationProviderClient(context);
                fusedCallback=new LocationCallback(){@Override public void onLocationResult(LocationResult result){
                    synchronized(RunEngine.this){if(generation!=locationGeneration||!listening)return;for(Location location:result.getLocations())onLocationChanged(location);}
                }};
                LocationRequest request=new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY,1000)
                    .setMinUpdateIntervalMillis(1000).setWaitForAccurateLocation(false).build();
                fused.requestLocationUpdates(request,fusedCallback,Looper.getMainLooper());
                currentLocation=new CancellationTokenSource();
                fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY,currentLocation.getToken()).addOnSuccessListener(location->{
                    synchronized(RunEngine.this){if(location!=null&&generation==locationGeneration&&listening)onLocationChanged(location);}
                });
            }catch(RuntimeException ignored){/* Platform GPS remains active. */}
        }
    }
    private void stopListening(){
        listening=false;locationGeneration++;manager.removeUpdates(this);
        if(currentLocation!=null){currentLocation.cancel();currentLocation=null;}
        if(fused!=null&&fusedCallback!=null)fused.removeLocationUpdates(fusedCallback);
        fusedCallback=null;fused=null;
    }
    @Override public synchronized void onLocationChanged(Location location){
        if(!listening||!source.equals("gps"))return;
        RunFilter.Fix f=new RunFilter.Fix(location.getLongitude(),location.getLatitude(),location.getAccuracy(),location.getTime());long now=System.currentTimeMillis();
        if(!Double.isFinite(f.lng)||!Double.isFinite(f.lat)||!Double.isFinite(f.accuracy)||f.accuracy<=0||Math.abs(f.lat)>90||Math.abs(f.lng)>180||f.time<=lastTimestamp||now-f.time>30000||f.time>now+5000)return;
        if(!sourceGate.accept(location.getProvider(),f.accuracy,f.time,now))return;
        final long receivedElapsed=SystemClock.elapsedRealtime();
        final long measuredElapsed=location.getElapsedRealtimeNanos()>0?location.getElapsedRealtimeNanos()/1000000L:receivedElapsed-Math.max(0,now-f.time);
        // A delayed pre-start/pre-resume callback cannot add movement to this segment.
        if(recording()&&measuredElapsed<segmentStart)return;
        lastTimestamp=f.time;
        if(f.accuracy<=1000)mapFix=f;
        if(f.accuracy>50){locationState="locating";speed=0;if(recording())filter.resetSegment();message="Approximate location found. Distance waits for a more accurate position.";return;}
        RunFilter.Result result=(recording()?filter:previewFilter).ingest(f,now);
        if(!result.accepted&&!result.reason.equals("stationary")){locationState="locating";message="Unreliable GPS movement ignored. Waiting for the next position.";return;}
        RunFilter.Fix previous=fix;fix=f;locationState="ready";lastGoodElapsed=SystemClock.elapsedRealtime();
        message=recording()?"Recording on this phone. You can lock the screen.":"GPS ready. Start when you are ready.";
        if(!recording())return;
        speed=0;
        if(result.accepted){
            if(count>=100000){try{stop();}catch(Exception ignored){}return;}
            double previousDistance=distance;distance+=result.distance;
            if(previous!=null&&!result.discontinuity)speed=result.distance/Math.max(.001,(f.time-lastAcceptedTimestamp)/1000.0);
            try{persist(pointJSON(f,result.discontinuity,FixTimeline.activeTime(measuredElapsed,receivedElapsed,segmentStart,activeMs)));count++;lastAcceptedTimestamp=f.time;}
            catch(Exception e){distance=previousDistance;speed=0;activeMs=elapsed();status="paused";stopListening();locationState="unavailable";message="Storage error. Recording paused; free space and reopen Keepleft.";}
        }
    }
    @Override public synchronized void onProviderDisabled(String provider){
        if(manager.isProviderEnabled(LocationManager.GPS_PROVIDER)||manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))return;
        locationState="unavailable";message="Location is switched off. Time continues; distance waits for GPS.";
    }
    @Override public void onProviderEnabled(String provider){}
    @Override public void onStatusChanged(String provider,int status,Bundle extras){}
    synchronized void checkpoint(){if(active())try{persist(null);}catch(Exception e){activeMs=elapsed();status="paused";speed=0;stopListening();message="Storage error. Recording paused; check free storage.";}}
    synchronized JSONObject state(String knownId,int after) throws Exception {
        JSONObject state=metadata();state.put("samples",id.isEmpty()?new JSONArray():database.samples(id,id.equals(knownId)?Math.min(count,Math.max(0,after)):0));state.put("sampleCount",count);return state;
    }
    private JSONObject metadata() throws Exception {
        JSONObject state=new JSONObject();state.put("source",source);
        String health=locationState;if(health.equals("ready")&&fix!=null&&System.currentTimeMillis()-fix.time>30000)health="timeout";
        String displayMessage=message;
        if(listening&&health.equals("locating")&&SystemClock.elapsedRealtime()-listeningSince>20000){
            health="timeout";displayMessage=mapFix==null?"Still waiting for a location. Step outside with a clear view of the sky, check precise location, then retry.":"Your approximate area is available. A more accurate position is needed to start recording.";
        }
        state.put("message",displayMessage);
        state.put("locationState",health);if(fix!=null)state.put("fix",fixJSON(fix));if(mapFix!=null)state.put("mapFix",fixJSON(mapFix));
        if(!id.isEmpty()){
            JSONObject snapshot=new JSONObject();snapshot.put("status",status);snapshot.put("elapsedMs",elapsed());snapshot.put("distanceM",distance);snapshot.put("speedMps",recording()&&SystemClock.elapsedRealtime()-lastGoodElapsed<5000?speed:0);snapshot.put("progress",0);
            JSONObject activity=new JSONObject();activity.put("version",1);activity.put("id",id);activity.put("source","gps");activity.put("activityType",activityType);activity.put("startedAtMs",startedWall);activity.put("endedAtMs",endedWall);if(!place.isEmpty())activity.put("placeName",place);activity.put("snapshot",snapshot);state.put("activity",activity);
        }return state;
    }
    private void persist(JSONObject point) throws Exception {database.commit(metadata(),point,count);}
    private static JSONObject fixJSON(RunFilter.Fix f) throws Exception {JSONObject o=new JSONObject();o.put("lng",f.lng);o.put("lat",f.lat);o.put("accuracyM",f.accuracy);o.put("timestampMs",f.time);return o;}
    private static JSONObject pointJSON(RunFilter.Fix f,boolean broken,long elapsed) throws Exception {JSONObject o=fixJSON(f);o.put("breakBefore",broken);o.put("activeElapsedMs",elapsed);return o;}
    private static RunFilter.Fix fromJSON(JSONObject o) throws Exception {return new RunFilter.Fix(o.getDouble("lng"),o.getDouble("lat"),o.getDouble("accuracyM"),o.getLong("timestampMs"));}
}
