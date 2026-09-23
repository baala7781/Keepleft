package app.keepleft.mobile;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name="KeepleftRun",permissions={
    @Permission(alias="location",strings={Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION}),
    @Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})
})
public class KeepleftRunPlugin extends Plugin {
    private final java.util.concurrent.ExecutorService videoWorker=java.util.concurrent.Executors.newSingleThreadExecutor();
    private StoryEncoder video;
    @PluginMethod public void beginStory(PluginCall call){videoWorker.execute(()->{
        try{if(video!=null)throw new IllegalStateException("Another export is running.");
            File directory=new File(getContext().getCacheDir(),"exports");if(!directory.exists()&&!directory.mkdirs())throw new IllegalStateException();
            String id="story-"+java.util.UUID.randomUUID();video=new StoryEncoder(directory,id,call.getInt("width",720),call.getInt("height",1280));JSObject result=new JSObject();result.put("id",id);call.resolve(result);
        }catch(Exception e){call.reject("Could not start video export. Check free storage and retry.");}
    });}
    @PluginMethod public void storyFrame(PluginCall call){videoWorker.execute(()->{
        try{if(video==null||!video.id.equals(call.getString("id")))throw new IllegalStateException();video.frame(call.getInt("index",-1),call.getString("jpeg",""));call.resolve();}
        catch(Exception e){if(video!=null){video.abort();video=null;}call.reject("Could not encode this video. Your photo and run are unchanged.");}
    });}
    @PluginMethod public void finishStory(PluginCall call){videoWorker.execute(()->{
        try{if(video==null||!video.id.equals(call.getString("id")))throw new IllegalStateException();video.finish();video=null;call.resolve();}
        catch(Exception e){if(video!=null){video.abort();video=null;}call.reject("Could not finish this video. Please retry.");}
    });}
    @PluginMethod public void cancelStory(PluginCall call){videoWorker.execute(()->{if(video!=null&&video.id.equals(call.getString("id"))){video.abort();video=null;}call.resolve();});}
    @PluginMethod public void saveSticker(PluginCall call){videoWorker.execute(()->{
        File file=null;
        try{String encoded=call.getString("gif","");if(encoded.length()>16000000)throw new IllegalArgumentException();byte[] bytes=android.util.Base64.decode(encoded,android.util.Base64.DEFAULT);
            if(bytes.length<20||!new String(bytes,0,6,StandardCharsets.US_ASCII).equals("GIF89a"))throw new IllegalArgumentException();
            String id="sticker-"+java.util.UUID.randomUUID();File directory=new File(getContext().getCacheDir(),"exports");if(!directory.exists()&&!directory.mkdirs())throw new IllegalStateException();file=new File(directory,id+".gif");
            try(FileOutputStream stream=new FileOutputStream(file)){stream.write(bytes);}JSObject result=new JSObject();result.put("id",id);call.resolve(result);
        }catch(Exception e){if(file!=null)file.delete();call.reject("Could not save the GIF. Check free storage and retry.");}
    });}
    @PluginMethod public void shareStory(PluginCall call){
        String id=call.getString("id","");if(!id.matches("(story|sticker)-[0-9a-f-]{36}")){call.reject("Invalid export.");return;}
        boolean sticker=id.startsWith("sticker-");File file=new File(new File(getContext().getCacheDir(),"exports"),id+(sticker?".gif":".mp4"));if(!file.isFile()){call.reject("This export is no longer cached. Create it again.");return;}
        Intent share=new Intent(Intent.ACTION_SEND).setType(sticker?"image/gif":"video/mp4").putExtra(Intent.EXTRA_STREAM,FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file)).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().runOnUiThread(()->{try{getActivity().startActivity(Intent.createChooser(share,"Share your route animation"));call.resolve();}catch(Exception e){call.reject("No app could open this export.");}});
    }
    private RunEngine engine(){return RunEngine.get(getContext());}
    private JSObject readState(PluginCall call) throws Exception {return new JSObject(engine().state(call.getString("id",""),call.getInt("after",0)).toString());}
    @PluginMethod public void state(PluginCall call){try{call.resolve(readState(call));}catch(Exception e){call.reject("Could not read recording state.");}}
    @PluginMethod public void command(PluginCall call){getActivity().runOnUiThread(()->{
        String action=call.getString("action","");
        if(action.equals("preview")||action.equals("start")||action.equals("resume")){
            if(getPermissionState("location")!=PermissionState.GRANTED){requestPermissionForAlias("location",call,"locationPermission");return;}
        }
        if((action.equals("start")||action.equals("resume"))&&Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")==PermissionState.PROMPT){requestPermissionForAlias("notifications",call,"notificationPermission");return;}
        execute(call);
    });}
    @PermissionCallback private void locationPermission(PluginCall call){if(getPermissionState("location")==PermissionState.GRANTED)command(call);else call.reject("Allow precise location to record your run, then retry.");}
    @PermissionCallback private void notificationPermission(PluginCall call){getActivity().runOnUiThread(()->execute(call));}
    private void execute(PluginCall call){
        try{
            String action=call.getString("action","");RunEngine engine=engine();
            switch(action){
                case "prepare":engine.prepare();break;
                case "preview":engine.preview();break;
                case "start":engine.start(call.getString("value","run"));startRecorderService(engine);break;
                case "pause":engine.pause();break;
                case "resume":engine.resume();startRecorderService(engine);break;
                case "stop":engine.stop();getContext().stopService(new Intent(getContext(),RunService.class));break;
                case "demo":engine.demo();break;
                case "stopPreview":engine.stopPreview();break;
                case "place":engine.place(call.getString("value",""));break;
                default:throw new IllegalArgumentException("Unknown recording action.");
            }
            call.resolve(new JSObject(engine.state("",0).toString()));
        }catch(SecurityException e){pauseFailedStart(call);call.reject("Android location permission is unavailable. Allow precise location and retry.");}
        catch(Exception e){pauseFailedStart(call);call.reject(e instanceof IllegalStateException?e.getMessage():"Could not complete recording action. Check location settings and free storage.");}
    }
    private void pauseFailedStart(PluginCall call){String action=call.getString("action","");if(action.equals("start")||action.equals("resume"))try{engine().pause();}catch(Exception ignored){}}
    private void startRecorderService(RunEngine engine) throws Exception {
        try{ContextCompat.startForegroundService(getContext(),new Intent(getContext(),RunService.class));}
        catch(Exception error){engine.pause();throw new IllegalStateException("Android could not start background recording. Your run is paused; reopen Keepleft and retry.");}
    }
    @PluginMethod public void list(PluginCall call){try{JSObject result=new JSObject();result.put("activities",engine().database.list());call.resolve(result);}catch(Exception e){call.reject("Could not read saved runs.");}}
    @PluginMethod public void get(PluginCall call){try{JSObject result=new JSObject();JSONObject a=engine().database.get(call.getString("id",""));if(a!=null)result.put("activity",a);call.resolve(result);}catch(Exception e){call.reject("Could not read this run.");}}
    @PluginMethod public void save(PluginCall call){try{JSONObject activity=call.getObject("activity");if(activity==null||engine().database.get(activity.getString("id"))==null)throw new IllegalStateException();call.resolve();}catch(Exception e){call.reject("This run has not been saved. Stop recording and retry.");}}
    @PluginMethod public void remove(PluginCall call){try{engine().removeSaved(call.getString("id",""));call.resolve();}catch(Exception e){call.reject("Could not delete this run. Stop recording first.");}}
    @PluginMethod public void getMap(PluginCall call){try{JSObject result=new JSObject();JSONObject world=engine().database.map(call.getString("key",""));if(world!=null)result.put("world",world);call.resolve(result);}catch(Exception e){call.reject("Could not read saved map.");}}
    @PluginMethod public void putMap(PluginCall call){try{engine().database.putMap(call.getObject("world"));call.resolve();}catch(Exception e){call.reject("Could not save map for offline use.");}}
    @PluginMethod public void exportRoute(PluginCall call){
        try{
            String name=call.getString("name","keepleft-activity.geojson").replaceAll("[^a-zA-Z0-9._-]","_");
            File directory=new File(getContext().getCacheDir(),"exports");if(!directory.exists()&&!directory.mkdirs())throw new IllegalStateException();
            File file=new File(directory,name);try(FileOutputStream stream=new FileOutputStream(file)){stream.write(call.getString("data","{}").getBytes(StandardCharsets.UTF_8));}
            Intent share=new Intent(Intent.ACTION_SEND).setType("application/geo+json").putExtra(Intent.EXTRA_STREAM,FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file)).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().runOnUiThread(()->{getActivity().startActivity(Intent.createChooser(share,"Export route"));call.resolve();});
        }catch(Exception e){call.reject("Could not export the route.");}
    }
    @Override protected void handleOnDestroy(){engine().stopPreview();videoWorker.execute(()->{if(video!=null){video.abort();video=null;}});videoWorker.shutdown();}
}
