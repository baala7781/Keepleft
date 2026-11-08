import { describe, it, expect, vi } from 'vitest';
import {
  estimateReplayVideoDuration,
  formatVideoDuration,
  draw3DTelemetryOverlay,
  export3DVideo,
  REPLAY_3D_SPEEDS,
  type Replay3DOptions,
  StoryReplayRuntime,
} from './replay-3d';
import type { SavedActivity } from '../tracking/storage';
import { ReplayRuntime } from '../tracking/replay';
import type { StoryBridge } from './export';

const syntheticActivity: SavedActivity = {
  version: 1,
  id: 'test-activity',
  startedAtMs: 1700000000000,
  endedAtMs: 1700000120000,
  activityType: 'run',
  source: 'gps',
  snapshot: { status: 'complete', elapsedMs: 120000, distanceM: 5000, speedMps: 3.5, progress: 1 },
  samples: [
    { lng: 79.2, lat: 30.6, timestampMs: 1700000000000, accuracyM: 5, activeElapsedMs: 0, breakBefore: false },
    { lng: 79.201, lat: 30.601, timestampMs: 1700000060000, accuracyM: 5, activeElapsedMs: 60000, breakBefore: false },
    { lng: 79.202, lat: 30.602, timestampMs: 1700000120000, accuracyM: 5, activeElapsedMs: 120000, breakBefore: false },
  ],
};

const bridge = () => ({
  beginStory: vi.fn().mockResolvedValue({ id: 'test-video-id' }),
  storyFrame: vi.fn().mockResolvedValue(undefined),
  finishStory: vi.fn().mockResolvedValue(undefined),
  cancelStory: vi.fn().mockResolvedValue(undefined),
  shareStory: vi.fn(),
  saveSticker: vi.fn(),
  saveImage: vi.fn(),
  copyImage: vi.fn(),
} satisfies StoryBridge);

describe('3D replay video exporter', () => {
  it('supports the required speed multipliers: 2x, 3x, 8x, 10x, 20x', () => {
    expect(REPLAY_3D_SPEEDS).toEqual([2, 3, 8, 10, 20]);
  });

  it('calculates accurate, distinct video durations across different replay speeds', () => {
    // 2-minute run (120 seconds):
    expect(estimateReplayVideoDuration(120000, 2)).toBe(30);
    expect(estimateReplayVideoDuration(120000, 3)).toBe(24);
    expect(estimateReplayVideoDuration(120000, 8)).toBe(18);
    expect(estimateReplayVideoDuration(120000, 10)).toBe(14);
    expect(estimateReplayVideoDuration(120000, 20)).toBe(10);

    // Short run (42 seconds):
    expect(estimateReplayVideoDuration(42000, 2)).toBe(21);
    expect(estimateReplayVideoDuration(42000, 3)).toBe(14);
    expect(estimateReplayVideoDuration(42000, 8)).toBe(5);
    expect(estimateReplayVideoDuration(42000, 10)).toBe(4);
    expect(estimateReplayVideoDuration(42000, 20)).toBe(3);

    // Multi-kilometer run (1km, 5km, etc.):
    expect(estimateReplayVideoDuration(600000, 2)).toBe(30);
    expect(estimateReplayVideoDuration(600000, 3)).toBe(24);
    expect(estimateReplayVideoDuration(600000, 8)).toBe(18);
    expect(estimateReplayVideoDuration(600000, 10)).toBe(14);
    expect(estimateReplayVideoDuration(600000, 20)).toBe(10);

    // Formats video durations cleanly for the UI
    expect(formatVideoDuration(15)).toBe('15s');
    expect(formatVideoDuration(60)).toBe('1m');
    expect(formatVideoDuration(150)).toBe('2m 30s');
    expect(formatVideoDuration(400)).toBe('6m 40s');
  });

  it('StoryReplayRuntime supports arbitrary speeds (2x, 3x, 8x, 10x, 20x) and loops', () => {
    const runtime = new StoryReplayRuntime(syntheticActivity, 8);
    expect(runtime.durationMs).toBe(120000);

    runtime.setSpeed(20);
    runtime.play(1000);
    // 100ms real time at 20x speed advances 2000ms:
    runtime.update(1100);
    expect(runtime.getSnapshot().elapsedMs).toBeGreaterThan(0);

    // Loops back when exceeding duration
    runtime.seek(119900, 2000);
    runtime.update(2100); // 100ms * 20 = 2000ms -> overflows 120000 -> loops to ~0
    expect(runtime.getSnapshot().elapsedMs).toBeLessThan(120000);
    runtime.dispose();
  });

  it('draws telemetry overlay onto target canvas without throwing', () => {
    const fillRect = vi.fn(), fillText = vi.fn(), measureText = vi.fn().mockReturnValue({ width: 40 });
    const createLinearGradient = vi.fn().mockReturnValue({ addColorStop: vi.fn() });
    const fakeCtx = {
      save: vi.fn(), restore: vi.fn(), fillRect, fillText, measureText, createLinearGradient,
      beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    draw3DTelemetryOverlay(fakeCtx, 720, 1280, syntheticActivity, 60000, 120000, {
      speed: 8,
      metrics: ['distance', 'time', 'pace'],
      hideEnds: true,
    });

    expect(fillText).toHaveBeenCalledWith(expect.stringContaining('YourLeft'), expect.any(Number), expect.any(Number));
    expect(fillText).toHaveBeenCalledWith('8× SPEED', expect.any(Number), expect.any(Number));
    expect(fillText).toHaveBeenCalledWith(expect.stringContaining('km'), expect.any(Number), expect.any(Number));
  });

  it('exports native story frames with selected speed and finishes cleanly', async () => {
    const compositeCanvas = {
      width: 720, height: 1280,
      getContext: vi.fn().mockReturnValue({
        fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        fillText: vi.fn(), measureText: vi.fn().mockReturnValue({ width: 50 }),
        beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      }),
      toDataURL: () => 'data:image/jpeg;base64,mockframe',
    } as unknown as HTMLCanvasElement;

    const mapCanvas = { width: 400, height: 800 } as unknown as HTMLCanvasElement;
    const replay = new ReplayRuntime(syntheticActivity);
    const b = bridge();

    const options: Replay3DOptions = {
      speed: 20, // 120s / 20 = 6s * 30fps = 180 frames
      preset: 'story',
      metrics: ['distance', 'time', 'pace'],
      hideEnds: true,
      forceNative: true,
    };

    // Mock isAndroid
    vi.stubGlobal('navigator', { userAgent: 'Android' });
    const result = await export3DVideo(
      compositeCanvas,
      mapCanvas,
      replay,
      syntheticActivity,
      options,
      new AbortController().signal,
      () => { },
      b,
    );

    expect(b.beginStory).toHaveBeenCalledWith(expect.objectContaining({ width: 720, height: 1280 }));
    expect(b.finishStory).toHaveBeenCalledWith({ id: 'test-video-id' });
    expect(result.extension).toBe('mp4');
    replay.dispose();
  });

  it('exports downloadable browser 3D video blob and supports download link creation', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' });

    const track = { stop: vi.fn() };
    const fakeStream = { getTracks: () => [track] };
    const compositeCanvas = {
      width: 720,
      height: 1280,
      getContext: vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
        fillText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 50 }),
        beginPath: vi.fn(),
        roundRect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
      }),
      captureStream: vi.fn().mockReturnValue(fakeStream),
    } as unknown as HTMLCanvasElement;

    const mapCanvas = { width: 400, height: 800 } as unknown as HTMLCanvasElement;
    const replay = new ReplayRuntime(syntheticActivity);

    class MockMediaRecorder {
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(['fake-mp4-video-bytes'], { type: 'video/mp4' }) });
        }
        if (this.onstop) {
          this.onstop();
        }
      }

      static isTypeSupported(type: string) {
        return type.includes('video/mp4');
      }
    }

    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const mockElement = { tagName: 'A', href: '', download: '', click: vi.fn() };
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockElement),
    });
    if (!globalThis.URL.createObjectURL) {
      vi.stubGlobal('URL', {
        ...globalThis.URL,
        createObjectURL: vi.fn().mockReturnValue('blob:http://localhost:3000/mock-video-url'),
        revokeObjectURL: vi.fn(),
      });
    }

    const progressValues: number[] = [];
    const result = await export3DVideo(
      compositeCanvas,
      mapCanvas,
      replay,
      syntheticActivity,
      { speed: 20, preset: 'story', metrics: ['distance', 'time', 'pace'], hideEnds: true },
      new AbortController().signal,
      p => progressValues.push(p),
    );

    expect(result.blob).toBeDefined();
    expect(result.blob!.size).toBeGreaterThan(0);
    expect(result.extension).toBe('mp4');
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(1);

    // Verify blob URL and download element creation
    const blobUrl = URL.createObjectURL(result.blob!);
    expect(blobUrl).toBeDefined();

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `yourleft-3d-moment.${result.extension}`;
    expect(link.download).toBe('yourleft-3d-moment.mp4');
    expect(link.href).toBe(blobUrl);

    URL.revokeObjectURL(blobUrl);
    replay.dispose();
  });
});
