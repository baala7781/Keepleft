package app.keepleft.mobile;

/** One position stream at a time. Fused also contains satellite estimates;
 * alternating it with raw GPS creates two competing tracks, not extra accuracy. */
final class LocationSourceGate {
    private long goodGpsTime;
    void reset(){goodGpsTime=0;}
    boolean accept(String provider,double accuracy,long timestamp,long now){
        if("gps".equals(provider)&&accuracy<=25&&now-timestamp<=10000){goodGpsTime=timestamp;return true;}
        return goodGpsTime==0||now-goodGpsTime>10000;
    }
}
