import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressComponent from './Progress'; // Default export

// Mock Zustand stores
const mockAppStoreState = {
  setStatus: vi.fn(),
  videoElement: null as HTMLVideoElement | null // Mock video element if its properties are used
};
vi.mock('@/stores/appStore', () => ({
  useAppStore: vi.fn((selector) => selector(mockAppStoreState))
}));

const mockGifStoreState = {
  colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'],
  result: null as { blob: Blob } | null,
  processedFrameCount: 0,
  frameCount: 10,
  width: 320,
  height: 240,
  name: 'test-gif'
};
vi.mock('@/stores/gifGeneratorStore', () => ({
  useGifStore: vi.fn((selector) => selector(mockGifStoreState))
}));

// Mock utility functions
vi.mock('@/utils/getClosestGridDimensions', () => ({
  getClosestGridDimensions: vi.fn((w, h, len) => {
    if (len === 0) return [0, 0];
    const c = Math.ceil(Math.sqrt(len));
    const r = Math.ceil(len / c);
    return [c, r]; // Simplified mock
  })
}));
vi.mock('@/utils/observeBoundingClientRect', () => ({
  observeBoundingClientRect: vi.fn(() => vi.fn()) // Returns a cancel function
}));

// Mock SVGs
vi.mock('@/assets/arrow-right.svg?react', () => ({
  default: () => <svg data-testid="arrow-right-icon" />
}));
vi.mock('@/assets/arrow-down.svg?react', () => ({
  default: () => <svg data-testid="arrow-down-icon" />
}));

// Mock motion components to simplify testing animations
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    motion: {
      // Mock specific motion components used, e.g., div, span, img, li
      div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
      span: vi.fn(({ children, ...props }) => (
        <span {...props}>{children}</span>
      )), // Corrected: removed extra parentheses
      // eslint-disable-next-line jsx-a11y/alt-text -- This is a mock definition, props including alt are spread.
      img: vi.fn((props) => <img {...props} />),
      li: vi.fn(({ children, ...props }) => <li {...props}>{children}</li>)
    },
    AnimatePresence: vi.fn(({ children }) => <>{children}</>) // Pass through children
  };
});

describe('Progress', () => {
  beforeEach(() => {
    // Reset store states before each test
    mockAppStoreState.setStatus.mockClear();
    mockAppStoreState.videoElement = document.createElement('video'); // Basic mock

    mockGifStoreState.result = null;
    mockGifStoreState.processedFrameCount = 0;
    mockGifStoreState.frameCount = 10;
    mockGifStoreState.name = 'test-gif';
    mockGifStoreState.width = 320;
    mockGifStoreState.height = 240;
    mockGifStoreState.colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(
      (blob) => `blob:${blob?.type || 'image/gif'}`
    );
    global.URL.revokeObjectURL = vi.fn();
  });

  it('should render without crashing', () => {
    render(<ProgressComponent />);
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Download GIF/i })
    ).toBeInTheDocument();
  });

  it('should display chunk items based on processedFrameCount', () => {
    mockGifStoreState.processedFrameCount = 3;
    mockGifStoreState.frameCount = 5;
    render(<ProgressComponent />);
    // motion.li is mocked as li
    const chunks = screen.getAllByRole('listitem');
    expect(chunks).toHaveLength(3);
  });

  it('should not display image if result is null', () => {
    mockGifStoreState.result = null;
    render(<ProgressComponent />);
    expect(
      screen.queryByAltText('Generated GIF preview')
    ).not.toBeInTheDocument();
  });

  it('should display image and correct download link if result is present', () => {
    const mockBlob = new Blob(['gif data'], { type: 'image/gif' });
    mockGifStoreState.result = { blob: mockBlob };
    mockGifStoreState.name = 'my-awesome-gif';
    render(<ProgressComponent />);

    const img = screen.getByAltText(
      'Generated GIF preview'
    ) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe(`blob:image/gif`);

    const downloadLink = screen.getByRole('link', { name: /Download GIF/i });
    expect(downloadLink).toHaveAttribute('href', `blob:image/gif`);
    expect(downloadLink).toHaveAttribute('download', 'my-awesome-gif.gif');
  });

  it('Download button should be disabled if result is null, enabled if result is present', () => {
    mockGifStoreState.result = null;
    const { rerender } = render(<ProgressComponent />);
    let downloadButton = screen.getByRole('button', { name: /Download GIF/i });
    expect(downloadButton).toBeDisabled();

    const mockBlob = new Blob(['gif data'], { type: 'image/gif' });
    mockGifStoreState.result = { blob: mockBlob };
    rerender(<ProgressComponent />);
    downloadButton = screen.getByRole('button', { name: /Download GIF/i });
    expect(downloadButton).not.toBeDisabled();
  });

  it('clicking Back button calls setStatus with "configuring"', async () => {
    render(<ProgressComponent />);
    const backButton = screen.getByRole('button', { name: /Back/i });
    await userEvent.click(backButton);
    expect(mockAppStoreState.setStatus).toHaveBeenCalledWith('configuring');
  });

  // ARIA attributes for progress are not directly on a progressbar role here,
  // as it's a visual representation with chunks and then an image.
  // The "progress" is implied by the number of chunks and then the appearance of the image.
});
