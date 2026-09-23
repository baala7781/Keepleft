package app.keepleft.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class FixTimelineTest {
    @Test public void preservesMeasurementSpacingForCallbacksDeliveredTogether(){
        assertEquals(1000,FixTimeline.activeTime(11000,12010,10000,0));
        assertEquals(1900,FixTimeline.activeTime(11900,12033,10000,0));
    }
    @Test public void excludesPausedTimeAndClampsCachedOrFutureFixes(){
        assertEquals(31000,FixTimeline.activeTime(101000,102000,100000,30000));
        assertEquals(30000,FixTimeline.activeTime(99000,102000,100000,30000));
        assertEquals(32000,FixTimeline.activeTime(103000,102000,100000,30000));
    }
}
