package app.keepleft.mobile;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.Image;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.util.Base64;
import java.io.File;
import java.nio.ByteBuffer;

/** Bounded, sequential on-device H.264 export. No route/photo is uploaded. */
final class StoryEncoder {
    final String id;
    final File file;
    private MediaCodec codec;
    private MediaMuxer muxer;
    private boolean started,closed;
    private int track,frames;
    private final MediaCodec.BufferInfo info=new MediaCodec.BufferInfo();
    private final int width,height;
    private final int[] pixels;
    private final byte[] yRow,uRow,vRow;
    StoryEncoder(File directory,String id,int width,int height) throws Exception {
        if(width!=720||(height!=720&&height!=900&&height!=1280))throw new IllegalArgumentException("Unsupported export dimensions.");
        this.width=width;this.height=height;pixels=new int[width*height];
        yRow=new byte[width];uRow=new byte[width/2];vRow=new byte[width/2];
        this.id=id;file=new File(directory,id+".mp4");
        try{
            MediaFormat format=MediaFormat.createVideoFormat("video/avc",width,height);
            format.setInteger(MediaFormat.KEY_COLOR_FORMAT,MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible);
            format.setInteger(MediaFormat.KEY_BIT_RATE,4500000);format.setInteger(MediaFormat.KEY_FRAME_RATE,30);format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL,1);
            format.setInteger(MediaFormat.KEY_COLOR_STANDARD,MediaFormat.COLOR_STANDARD_BT601_NTSC);
            format.setInteger(MediaFormat.KEY_COLOR_RANGE,MediaFormat.COLOR_RANGE_LIMITED);
            format.setInteger(MediaFormat.KEY_COLOR_TRANSFER,MediaFormat.COLOR_TRANSFER_SDR_VIDEO);
            codec=MediaCodec.createEncoderByType("video/avc");codec.configure(format,null,null,MediaCodec.CONFIGURE_FLAG_ENCODE);codec.start();
            muxer=new MediaMuxer(file.getAbsolutePath(),MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
        }catch(Exception e){abort();throw e;}
    }
    void frame(int index,String jpeg) throws Exception {
        if(closed||index!=frames||index>=360||jpeg.length()>4000000)throw new IllegalStateException("Invalid video frame.");
        byte[] bytes=Base64.decode(jpeg,Base64.DEFAULT);Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length);
        if(bitmap==null)throw new IllegalStateException("Could not read video frame.");
        try{if(bitmap.getWidth()!=width||bitmap.getHeight()!=height)throw new IllegalStateException("Invalid frame size.");bitmap.getPixels(pixels,0,width,0,0,width,height);}finally{bitmap.recycle();}
        int input=codec.dequeueInputBuffer(10000);long deadline=System.nanoTime()+5000000000L;
        while(input<0){drain(false);if(System.nanoTime()>deadline)throw new IllegalStateException("Video encoder stalled.");input=codec.dequeueInputBuffer(10000);}
        Image image=codec.getInputImage(input);if(image==null)throw new IllegalStateException("This phone's encoder does not support this export format.");
        try{
            Image.Plane[] planes=image.getPlanes();
            ByteBuffer[] buffers={planes[0].getBuffer(),planes[1].getBuffer(),planes[2].getBuffer()};
            int[] rows={planes[0].getRowStride(),planes[1].getRowStride(),planes[2].getRowStride()};
            int[] strides={planes[0].getPixelStride(),planes[1].getPixelStride(),planes[2].getPixelStride()};
            for(int y=0;y<height;y++){
                for(int x=0;x<width;x++)yRow[x]=(byte)StoryPixels.y(pixels[y*width+x]);
                StoryPixels.putRow(buffers[0],rows[0],strides[0],y,yRow);
            }
            for(int y=0;y<height;y+=2){
                for(int x=0;x<width;x+=2){
                    int a=pixels[y*width+x],b=pixels[y*width+x+1],c=pixels[(y+1)*width+x],d=pixels[(y+1)*width+x+1];
                    uRow[x/2]=(byte)((StoryPixels.u(a)+StoryPixels.u(b)+StoryPixels.u(c)+StoryPixels.u(d))/4);
                    vRow[x/2]=(byte)((StoryPixels.v(a)+StoryPixels.v(b)+StoryPixels.v(c)+StoryPixels.v(d))/4);
                }
                StoryPixels.putRow(buffers[1],rows[1],strides[1],y/2,uRow);StoryPixels.putRow(buffers[2],rows[2],strides[2],y/2,vRow);
            }
        }finally{image.close();}
        codec.queueInputBuffer(input,0,width*height*3/2,index*1000000L/30,0);frames++;drain(false);
    }
    private boolean drain(boolean wait) throws Exception {
        int output;
        while((output=codec.dequeueOutputBuffer(info,wait?10000:0))!=MediaCodec.INFO_TRY_AGAIN_LATER){
            if(output==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){if(started)throw new IllegalStateException();track=muxer.addTrack(codec.getOutputFormat());muxer.start();started=true;}
            else if(output>=0){
                ByteBuffer buffer=codec.getOutputBuffer(output);boolean eos=(info.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0;
                if((info.flags&MediaCodec.BUFFER_FLAG_CODEC_CONFIG)!=0)info.size=0;
                if(info.size>0){if(!started||buffer==null)throw new IllegalStateException();buffer.position(info.offset);buffer.limit(info.offset+info.size);muxer.writeSampleData(track,buffer,info);}
                codec.releaseOutputBuffer(output,false);if(eos)return true;
            }
        }
        return false;
    }
    void finish() throws Exception {
        if(closed||frames!=360)throw new IllegalStateException("Video frames are incomplete.");
        long deadline=System.nanoTime()+15000000000L;int input;
        while((input=codec.dequeueInputBuffer(10000))<0){drain(false);if(System.nanoTime()>deadline)throw new IllegalStateException("Video encoder stalled.");}
        codec.queueInputBuffer(input,0,0,frames*1000000L/30,MediaCodec.BUFFER_FLAG_END_OF_STREAM);
        while(!drain(true))if(System.nanoTime()>deadline)throw new IllegalStateException("Video encoder stalled.");
        if(!started)throw new IllegalStateException("No video was produced.");
        muxer.stop();muxer.release();muxer=null;codec.stop();codec.release();codec=null;closed=true;
    }
    void abort(){
        if(closed)return;closed=true;
        if(codec!=null){try{codec.stop();}catch(Exception ignored){}try{codec.release();}catch(Exception ignored){}codec=null;}
        if(muxer!=null){try{muxer.release();}catch(Exception ignored){}muxer=null;}
        // Only this unfinished cache file, never saved routes or another completed video.
        if(file.exists())file.delete();
    }
}
