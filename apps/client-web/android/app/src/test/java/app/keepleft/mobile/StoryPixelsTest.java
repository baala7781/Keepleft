package app.keepleft.mobile;
import org.junit.Test;
import java.nio.ByteBuffer;
import static org.junit.Assert.*;
public class StoryPixelsTest {
    @Test public void bulkRowsRespectPaddingAndUnsignedBytes(){
        ByteBuffer buffer=ByteBuffer.allocate(16);StoryPixels.putRow(buffer,8,1,1,new byte[]{16,(byte)235,(byte)255});
        assertEquals(0,buffer.get(7));assertEquals(16,buffer.get(8));assertEquals(235,buffer.get(9)&255);assertEquals(255,buffer.get(10)&255);assertEquals(0,buffer.get(11));
    }
    @Test public void chromaRowsRespectInterleavedPixelStride(){
        ByteBuffer buffer=ByteBuffer.allocate(16);StoryPixels.putRow(buffer,8,2,1,new byte[]{40,80,120});
        assertEquals(40,buffer.get(8));assertEquals(0,buffer.get(9));assertEquals(80,buffer.get(10));assertEquals(120,buffer.get(12));assertEquals(0,buffer.get(13));
    }
    @Test public void neutralBlackAndWhite(){assertEquals(16,StoryPixels.y(0xff000000));assertEquals(235,StoryPixels.y(0xffffffff));assertEquals(128,StoryPixels.u(0xffffffff));assertEquals(128,StoryPixels.v(0xff000000));}
    @Test public void redAndBlueHaveCorrectChroma(){assertTrue(StoryPixels.v(0xffff0000)>200);assertTrue(StoryPixels.u(0xff0000ff)>200);assertTrue(StoryPixels.u(0xffff0000)<128);}
}
