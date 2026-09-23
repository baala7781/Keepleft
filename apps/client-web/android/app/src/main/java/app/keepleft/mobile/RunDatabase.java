package app.keepleft.mobile;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONObject;

final class RunDatabase extends SQLiteOpenHelper {
    RunDatabase(Context context){super(context,"keepleft-runs.db",null,1);setWriteAheadLoggingEnabled(true);}
    @Override public void onCreate(SQLiteDatabase db){
        db.execSQL("CREATE TABLE current_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)");
        db.execSQL("CREATE TABLE runs (id TEXT PRIMARY KEY, started INTEGER NOT NULL, payload TEXT NOT NULL, complete INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE points (run_id TEXT NOT NULL, seq INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(run_id,seq))");
        db.execSQL("CREATE TABLE maps (key TEXT PRIMARY KEY, payload TEXT NOT NULL, touched INTEGER NOT NULL)");
    }
    @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){throw new IllegalStateException("Unsupported database upgrade");}
    synchronized JSONObject current() throws Exception {
        try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM current_state WHERE id=1",null)){return c.moveToFirst()?new JSONObject(c.getString(0)):null;}
    }
    synchronized void commit(JSONObject state,JSONObject point,int sequence) throws Exception {
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
        try{
            ContentValues current=new ContentValues();current.put("id",1);current.put("payload",state.toString());if(db.insertWithOnConflict("current_state",null,current,SQLiteDatabase.CONFLICT_REPLACE)<0)throw new IllegalStateException("Could not save state");
            JSONObject activity=state.optJSONObject("activity");
            if(activity!=null){
                String id=activity.getString("id");ContentValues run=new ContentValues();run.put("id",id);run.put("started",activity.getLong("startedAtMs"));run.put("payload",activity.toString());run.put("complete","complete".equals(activity.getJSONObject("snapshot").getString("status"))?1:0);
                if(db.insertWithOnConflict("runs",null,run,SQLiteDatabase.CONFLICT_REPLACE)<0)throw new IllegalStateException("Could not save run");
                if(point!=null){ContentValues p=new ContentValues();p.put("run_id",id);p.put("seq",sequence);p.put("payload",point.toString());if(db.insertOrThrow("points",null,p)<0)throw new IllegalStateException("Could not save sample");}
            }
            db.setTransactionSuccessful();
        }finally{db.endTransaction();}
    }
    synchronized JSONArray samples(String id,int after) throws Exception {
        JSONArray result=new JSONArray();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM points WHERE run_id=? AND seq>=? ORDER BY seq",new String[]{id,String.valueOf(Math.max(0,after))})){while(c.moveToNext())result.put(new JSONObject(c.getString(0)));}return result;
    }
    synchronized int count(String id){try(Cursor c=getReadableDatabase().rawQuery("SELECT COUNT(*) FROM points WHERE run_id=?",new String[]{id})){return c.moveToFirst()?c.getInt(0):0;}}
    synchronized JSONArray list() throws Exception {
        JSONArray result=new JSONArray();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM runs WHERE complete=1 ORDER BY started DESC",null)){
            while(c.moveToNext()){JSONObject a=new JSONObject(c.getString(0));a.put("sampleCount",count(a.getString("id")));result.put(a);}
        }return result;
    }
    synchronized JSONObject get(String id) throws Exception {
        try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM runs WHERE id=? AND complete=1",new String[]{id})){
            if(!c.moveToFirst())return null;JSONObject a=new JSONObject(c.getString(0));a.put("samples",samples(id,0));return a;
        }
    }
    synchronized void remove(String id) throws Exception {
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
        try{
            if(get(id)==null)throw new IllegalStateException("Saved run not found");
            JSONObject current=current();JSONObject activity=current==null?null:current.optJSONObject("activity");
            if(activity!=null&&id.equals(activity.optString("id")))db.delete("current_state","id=1",null);
            db.delete("points","run_id=?",new String[]{id});db.delete("runs","id=? AND complete=1",new String[]{id});db.setTransactionSuccessful();
        }finally{db.endTransaction();}
    }
    synchronized JSONObject map(String key) throws Exception {try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM maps WHERE key=?",new String[]{key})){return c.moveToFirst()?new JSONObject(c.getString(0)):null;}}
    synchronized void putMap(JSONObject world) throws Exception {
        String payload=world.toString();if(payload.length()>8*1024*1024)throw new IllegalArgumentException("Map too large");
        ContentValues values=new ContentValues();values.put("key",world.getString("key"));values.put("payload",payload);values.put("touched",System.currentTimeMillis());
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{db.insertWithOnConflict("maps",null,values,SQLiteDatabase.CONFLICT_REPLACE);db.execSQL("DELETE FROM maps WHERE key NOT IN (SELECT key FROM maps ORDER BY touched DESC LIMIT 8)");db.setTransactionSuccessful();}finally{db.endTransaction();}
    }
}
