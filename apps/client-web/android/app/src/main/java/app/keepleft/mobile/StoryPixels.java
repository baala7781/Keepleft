package app.keepleft.mobile;
import java.nio.ByteBuffer;
/** Limited-range BT.601 RGB to YUV420 conversion. Kept pure for device-independent tests. */
final class StoryPixels {
    static void putRow(ByteBuffer buffer,int rowStride,int pixelStride,int y,byte[] row){
        int offset=y*rowStride;
        if(pixelStride==1){buffer.position(offset);buffer.put(row);}
        else for(int x=0;x<row.length;x++)buffer.put(offset+x*pixelStride,row[x]);
    }
    private static int r(int c){return (c>>16)&255;}
    private static int g(int c){return (c>>8)&255;}
    private static int b(int c){return c&255;}
    static int y(int c){return ((66*r(c)+129*g(c)+25*b(c)+128)>>8)+16;}
    static int u(int c){return ((-38*r(c)-74*g(c)+112*b(c)+128)>>8)+128;}
    static int v(int c){return ((112*r(c)-94*g(c)-18*b(c)+128)>>8)+128;}
}
