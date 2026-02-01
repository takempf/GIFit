import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findBestVideo } from './videoDetection';

describe('findBestVideo', () => {
  let mockVideos: HTMLVideoElement[];

  beforeEach(() => {
    // Reset mocks and viewport
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
    mockVideos = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createMockVideo = (
    rect: Partial<DOMRect>,
    style: Partial<CSSStyleDeclaration> = {},
    isConnected = true
  ) => {
    const video = document.createElement('video');

    // Mock getBoundingClientRect
    video.getBoundingClientRect = vi.fn(() => ({
      width: rect.width || 0,
      height: rect.height || 0,
      top: rect.top || 0,
      left: rect.left || 0,
      right: (rect.left || 0) + (rect.width || 0),
      bottom: (rect.top || 0) + (rect.height || 0),
      x: rect.left || 0,
      y: rect.top || 0,
      toJSON: () => {}
    }));

    // Mock connection status
    Object.defineProperty(video, 'isConnected', {
      get: () => isConnected,
      configurable: true
    });

    // Mock readyState (default to HAVE_METADATA = 1)
    Object.defineProperty(video, 'readyState', {
      get: () => 1,
      configurable: true
    });

    // Mock style
    // We cannot easily mock window.getComputedStyle specifically for this element without
    // potentially affecting others if we stub the global.
    // However, since we are passing these elements to the function,
    // we can stub window.getComputedStyle to return specific styles for specific elements.

    return video;
  };

  const setupComputedStyleMock = (
    elementStyles: Map<HTMLElement, Partial<CSSStyleDeclaration>>
  ) => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation((elt) => {
      const style = elementStyles.get(elt as HTMLElement) || {};
      return {
        visibility: 'visible',
        display: 'block',
        opacity: '1',
        ...style
      } as CSSStyleDeclaration;
    });
  };

  it('should return null if no videos are present', () => {
    expect(findBestVideo([])).toBeNull();
  });

  it('should return null if video is not connected', () => {
    const video = createMockVideo({ width: 100, height: 100 }, {}, false);
    setupComputedStyleMock(new Map());
    expect(findBestVideo([video])).toBeNull();
  });

  it('should return null if video has zero dimensions', () => {
    const video = createMockVideo({ width: 0, height: 0 });
    setupComputedStyleMock(new Map([[video, {}]]));
    expect(findBestVideo([video])).toBeNull();
  });

  it('should return null if video has no metadata (readyState = 0)', () => {
    const video = createMockVideo({ width: 100, height: 100 });
    Object.defineProperty(video, 'readyState', { get: () => 0 });
    setupComputedStyleMock(new Map([[video, {}]]));
    expect(findBestVideo([video])).toBeNull();
  });

  it('should return null if video is hidden via CSS', () => {
    const video1 = createMockVideo({ width: 100, height: 100 });
    const video2 = createMockVideo({ width: 100, height: 100 });
    const video3 = createMockVideo({ width: 100, height: 100 });

    const styles = new Map<HTMLElement, Partial<CSSStyleDeclaration>>([
      [video1, { visibility: 'hidden' }],
      [video2, { display: 'none' }],
      [video3, { opacity: '0' }]
    ]);
    setupComputedStyleMock(styles);

    expect(findBestVideo([video1, video2, video3])).toBeNull();
  });

  it('should return null if video is completely out of viewport', () => {
    const video = createMockVideo({
      top: 1000,
      left: 0,
      width: 100,
      height: 100
    }); // Viewport height is 768
    setupComputedStyleMock(new Map([[video, {}]]));

    expect(findBestVideo([video])).toBeNull();
  });

  it('should return the only visible video', () => {
    const video = createMockVideo({
      top: 0,
      left: 0,
      width: 100,
      height: 100
    });
    setupComputedStyleMock(new Map([[video, {}]]));

    expect(findBestVideo([video])).toBe(video);
  });

  it('should select the video with the largest visible area in viewport', () => {
    // Video 1: Small but fully visible (100x100 = 10000)
    const video1 = createMockVideo({
      top: 0,
      left: 0,
      width: 100,
      height: 100
    });

    // Video 2: Large but mostly offscreen (1000x1000, but only 10x1000 visible? No, let's say top at 700)
    // Viewport height 768. Top 700. Bottom 1700.
    // Visible height: 768 - 700 = 68.
    // Visible width: 1000 (assuming full width).
    // Area: 68 * 1000 = 68000.
    // Video 2 should win.
    const video2 = createMockVideo({
      top: 700,
      left: 0,
      width: 1000,
      height: 1000
    });

    // Video 3: Medium, fully visible (200x200 = 40000)
    const video3 = createMockVideo({
      top: 100,
      left: 100,
      width: 200,
      height: 200
    });

    setupComputedStyleMock(
      new Map([
        [video1, {}],
        [video2, {}],
        [video3, {}]
      ])
    );

    expect(findBestVideo([video1, video2, video3])).toBe(video2);
  });

  it('should prefer fully visible smaller video over slightly visible large video if area is greater', () => {
    // Large video barely visible
    // top 760 (8px visible height). Width 100. Area 800.
    const video1 = createMockVideo({
      top: 760,
      left: 0,
      width: 100,
      height: 1000
    });

    // Small video fully visible
    // 50x50 = 2500.
    const video2 = createMockVideo({
      top: 0,
      left: 0,
      width: 50,
      height: 50
    });

    setupComputedStyleMock(
      new Map([
        [video1, {}],
        [video2, {}]
      ])
    );

    expect(findBestVideo([video1, video2])).toBe(video2);
  });
});
