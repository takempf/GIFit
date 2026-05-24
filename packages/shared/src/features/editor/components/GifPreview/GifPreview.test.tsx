import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GifPreview } from './GifPreview';

describe('GifPreview', () => {
  it('renders placeholder when previewImage is null', () => {
    render(
      <GifPreview
        previewImage={null}
        width={420}
        height={236}
        videoWidth={1920}
        videoHeight={1080}
      />
    );
    expect(
      screen.getByRole('status', { name: /loading/i })
    ).toBeInTheDocument();
    expect(screen.queryByAltText('Video Preview')).not.toBeInTheDocument();
  });

  it('renders image with correct src', () => {
    const previewImage = 'data:image/png;base64,fakeimage';

    render(
      <GifPreview
        previewImage={previewImage}
        width={420}
        height={236}
        videoWidth={1920}
        videoHeight={1080}
        status="configuring"
      />
    );

    const img = screen.getByAltText('Video Preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', previewImage);
  });

  it('uses video aspect ratio for wrapper regardless of status', () => {
    const { rerender } = render(
      <GifPreview
        previewImage="data:image/png;base64,fakeimage"
        width={420}
        height={334}
        videoWidth={1920}
        videoHeight={1080}
        status="configuring"
      />
    );

    const wrapper = screen.getByAltText('Video Preview').parentElement!;
    expect(wrapper.style.aspectRatio).toBe('1920 / 1080');
    expect(wrapper.style.maxHeight).toBe('min(100%, 236px)');

    // Same wrapper sizing after status change (no flash)
    rerender(
      <GifPreview
        previewImage="data:image/gif;base64,result"
        width={420}
        height={334}
        videoWidth={1920}
        videoHeight={1080}
        status="generated"
      />
    );

    expect(wrapper.style.aspectRatio).toBe('1920 / 1080');
    expect(wrapper.style.maxHeight).toBe('min(100%, 236px)');
  });
});
