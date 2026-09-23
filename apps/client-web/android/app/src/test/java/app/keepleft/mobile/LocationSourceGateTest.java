package app.keepleft.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class LocationSourceGateTest {
    @Test public void rejectsCompetingFusedFixesWhileSatelliteStreamIsFresh(){LocationSourceGate g=new LocationSourceGate();assertTrue(g.accept("fused",3,1000,1000));assertTrue(g.accept("gps",4,2000,2000));for(int t=3000;t<12000;t+=1000){assertFalse(g.accept("fused",3,t,t));assertTrue(g.accept("gps",4,t+100,t+100));}}
    @Test public void permitsFusedFallbackAfterSatelliteDropout(){LocationSourceGate g=new LocationSourceGate();g.accept("gps",4,1000,1000);assertFalse(g.accept("fused",3,11000,11000));assertTrue(g.accept("fused",3,12000,12000));g.reset();assertTrue(g.accept("fused",3,13000,13000));}
    @Test public void keepsGoodGpsInsteadOfBouncingToNetwork(){LocationSourceGate g=new LocationSourceGate();assertTrue(g.accept("gps",4,1000,1000));assertFalse(g.accept("network",20,2000,2000));assertTrue(g.accept("gps",5,3000,3000));}
    @Test public void allowsNetworkForInitialAcquisitionAndSatelliteDropout(){LocationSourceGate g=new LocationSourceGate();assertTrue(g.accept("network",20,1000,1000));g.accept("gps",4,2000,2000);assertTrue(g.accept("network",20,13000,13000));g.reset();assertTrue(g.accept("network",20,14000,14000));}
}
