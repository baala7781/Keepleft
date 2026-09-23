package app.keepleft.mobile;

/** Timestamp fixes at measurement time, not callback delivery time. */
final class FixTimeline {
    static long activeTime(long measuredElapsed,long receivedElapsed,long segmentStart,long activeBase){
        return activeBase+Math.max(0,Math.min(receivedElapsed,measuredElapsed)-segmentStart);
    }
}
