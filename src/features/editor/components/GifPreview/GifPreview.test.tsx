import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GifPreview } from './GifPreview';

describe('GifPreview', () => {
  it('renders nothing when previewImage is null', () => {
    const { container } = render(
      <GifPreview previewImage={null} width={1920} height={1080} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders image with correct src and dimensions', () => {
    const previewImage = 'data:image/png;base64,fakeimage';
    const width = 800;
    const height = 450;

    render(
      <GifPreview previewImage={previewImage} width={width} height={height} />
    );

    const img = screen.getByAltText('Video Preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', previewImage);

    // Check styles
    expect(img).toHaveStyle('width: auto');
    expect(img).toHaveStyle('height: auto');
    expect(img).toHaveStyle(`max-width: min(100%, ${width}px)`);
    expect(img).toHaveStyle(`max-height: min(100%, ${height}px)`);
    expect(img).toHaveStyle(`aspect-ratio: ${width} / ${height}`);
  });
});
