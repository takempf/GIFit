import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  StoryboardFrame,
  StoryboardFrameData
} from './TimelineStoryboardFrame';

describe('TimelineStoryboardFrame', () => {
  const mockFrame: StoryboardFrameData = {
    url: 'test.jpg',
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    sheetWidth: 1000,
    sheetHeight: 500
  };

  it('renders correctly with given frame data', () => {
    const { container } = render(<StoryboardFrame frame={mockFrame} />);
    const frameElement = container.firstChild as HTMLElement;

    const style = frameElement.style;
    expect(style.getPropertyValue('--aspect-ratio')).toBe('2');
    expect(style.getPropertyValue('--bg-image')).toBe('url(test.jpg)');
    expect(style.getPropertyValue('--bg-position')).toContain('%');
    expect(style.getPropertyValue('--bg-size')).toBe('1000% 1000%');
  });
});
