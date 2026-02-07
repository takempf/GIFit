import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimelineStoryboard } from './TimelineStoryboard';
import type { VirtualItem } from '@tanstack/react-virtual';
import { getStoryboardFrame } from '@/utils/storyboard';

// Mock child component
vi.mock('../TimelineStoryboardFrame/TimelineStoryboardFrame', () => ({
  StoryboardFrame: () => <div data-testid="storyboard-frame" />
}));

// Mock utils
vi.mock('@/utils/storyboard', () => ({
  getStoryboardFrame: vi.fn(),
  StoryboardLevel: {}
}));

describe('TimelineStoryboard', () => {
  const mockVirtualItems: VirtualItem[] = [
    { key: '0', index: 0, start: 0, size: 100, end: 100, lane: 0 }
  ];

  const mockStoryboardSpec = {
    baseUrl: 'http://test.com',
    levels: [
      {
        interval: 100,
        width: 100,
        height: 100,
        rows: 10,
        cols: 10,
        format: 'jpg'
      }
    ]
  };

  it('renders frames for valid virtual items', () => {
    (getStoryboardFrame as any).mockReturnValue({ some: 'frame' });

    const { getAllByTestId } = render(
      <TimelineStoryboard
        virtualItems={mockVirtualItems}
        storyboardSpec={mockStoryboardSpec as any}
        totalDurationMs={5000}
      />
    );

    expect(getAllByTestId('storyboard-frame')).toHaveLength(1);
  });

  it('does not render if frame data is missing', () => {
    (getStoryboardFrame as any).mockReturnValue(null);

    const { queryByTestId } = render(
      <TimelineStoryboard
        virtualItems={mockVirtualItems}
        storyboardSpec={mockStoryboardSpec as any}
        totalDurationMs={5000}
      />
    );

    expect(queryByTestId('storyboard-frame')).not.toBeInTheDocument();
  });

  it('does not render if start time is beyond total duration', () => {
    const virtualItems: VirtualItem[] = [
      { key: '100', index: 100, start: 0, size: 100, end: 100, lane: 0 }
    ];

    (getStoryboardFrame as any).mockReturnValue({ some: 'frame' });

    const { queryByTestId } = render(
      <TimelineStoryboard
        virtualItems={virtualItems}
        storyboardSpec={mockStoryboardSpec as any}
        totalDurationMs={5000}
      />
    );

    expect(queryByTestId('storyboard-frame')).not.toBeInTheDocument();
  });
});
