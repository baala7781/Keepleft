package app.keepleft.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class RunFilterTest {
    @Test public void cyclingUsesItsOwnLimitsWithoutWeakeningRunOrWalk(){
        for(String type:new String[]{"walk","run","cycle"}){
            RunFilter filter=new RunFilter(type);filter.ingest(fix(0,4,1000),1000);
            RunFilter.Result movement=filter.ingest(fix(.00054,4,4000),4000);
            assertEquals(type.equals("cycle"),movement.accepted);
            if(movement.accepted)assertTrue(movement.distance>55);
        }
    }
    @Test(expected=IllegalArgumentException.class) public void refusesUnknownActivityType(){new RunFilter("car");}
    @Test public void rejectsAFalseSideTripWithoutRejectingARealReturn(){
        RunFilter f=new RunFilter();f.ingest(fix(0,4,1000),1000);f.ingest(fix(.00005,4,5000),5000);
        assertEquals("jump",f.ingest(fix(.00036,20,8000),8000).reason);
        RunFilter.Result back=f.ingest(fix(.0001,4,11000),11000);assertTrue(back.accepted);assertTrue(back.distance<6);
        assertTrue(f.ingest(fix(.00005,4,16000),16000).accepted);
    }
    @Test public void confirmedRelocationStartsAGapRatherThanDrawingAFalseRoute(){
        RunFilter f=new RunFilter();f.ingest(fix(0,4,1000),1000);
        assertFalse(f.ingest(fix(.0003,4,4000),4000).accepted);
        RunFilter.Result next=f.ingest(fix(.00031,4,5000),5000);assertTrue(next.accepted);assertTrue(next.discontinuity);assertEquals(0,next.distance,0);
    }
    private static RunFilter.Fix fix(double lat,double accuracy,long time){return new RunFilter.Fix(0,lat,accuracy,time);}
    @Test public void recordsMovementAndRejectsStationaryNoise(){
        RunFilter f=new RunFilter();assertTrue(f.ingest(fix(0,5,1000),1000).discontinuity);
        assertEquals("stationary",f.ingest(fix(.000001,5,2000),2000).reason);
        RunFilter.Result r=f.ingest(fix(.0001,5,6000),6000);assertTrue(r.accepted);assertFalse(r.discontinuity);assertEquals(11.12,r.distance,.02);
    }
    @Test public void excludesPauseAndSignalGaps(){
        RunFilter f=new RunFilter();f.ingest(fix(0,5,1000),1000);f.resetSegment();
        assertEquals(0,f.ingest(fix(.001,5,6000),6000).distance,0);
        RunFilter.Result gap=f.ingest(fix(.002,5,40000),40000);assertTrue(gap.discontinuity);assertEquals(0,gap.distance,0);
    }
    @Test public void rejectsStalePoorAndImpossibleFixes(){
        RunFilter f=new RunFilter();assertFalse(f.ingest(fix(0,67,1000),1000).accepted);
        assertFalse(f.ingest(fix(0,5,1000),40000).accepted);
        f.ingest(fix(0,5,40000),40000);assertEquals("jump",f.ingest(fix(.01,5,41000),41000).reason);
        assertFalse(f.ingest(fix(Double.NaN,5,42000),42000).accepted);
    }
    @Test public void accuracyRefinementDoesNotCountAsRunning(){
        RunFilter f=new RunFilter();f.ingest(fix(0,40,1000),1000);
        RunFilter.Result r=f.ingest(fix(.0001,5,6000),6000);assertEquals("refinement",r.reason);assertEquals(0,r.distance,0);assertTrue(r.discontinuity);
    }
}
