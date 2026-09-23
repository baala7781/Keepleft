package app.keepleft.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;

public class RunService extends Service {
    private static final String CHANNEL="keepleft-recording";
    private final Handler handler=new Handler(Looper.getMainLooper());
    private RunEngine engine;
    private final Runnable checkpoint=new Runnable(){@Override public void run(){engine.checkpoint();if(!engine.active()){stopSelf();return;}((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(41,notification());handler.postDelayed(this,5000);}};
    @Override public void onCreate(){super.onCreate();engine=RunEngine.get(this);if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel(CHANNEL,"Run recording",NotificationManager.IMPORTANCE_LOW);channel.setDescription("Keeps your run recording while the screen is locked.");getSystemService(NotificationManager.class).createNotificationChannel(channel);}startForeground(41,notification());handler.postDelayed(checkpoint,5000);}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        String action=intent==null?null:intent.getAction();
        try{if("pause".equals(action))engine.pause();else if("resume".equals(action))engine.resume();else if("stop".equals(action))engine.stop();}catch(Exception ignored){}
        if(!engine.active()){stopSelf();return START_NOT_STICKY;}
        getSystemService(NotificationManager.class).notify(41,notification());return START_STICKY;
    }
    private Notification notification(){
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String action=engine.recording()?"pause":"resume";
        PendingIntent toggle=PendingIntent.getService(this,1,new Intent(this,RunService.class).setAction(action),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop=PendingIntent.getService(this,2,new Intent(this,RunService.class).setAction("stop"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(R.drawable.ic_run_notification).setContentTitle(engine.recording()?"Keepleft is recording":"Keepleft run paused").setContentText(engine.recording()?"Your route is saving on this phone.":"Open Keepleft or tap Resume.").setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).setCategory(NotificationCompat.CATEGORY_SERVICE).addAction(0,engine.recording()?"Pause":"Resume",toggle).addAction(0,"Stop & save",stop).build();
    }
    @Override public void onDestroy(){handler.removeCallbacks(checkpoint);try{engine.pause();}catch(Exception ignored){}engine.checkpoint();super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
