import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { AdapterContext, AdapterSet } from '@shared/adapters/context';
import {
  VideoAdapter,
  GifAdapter,
  StorageAdapter
} from '@shared/adapters/types';
import { vi } from 'vitest';

export const createMockAdapters = (): AdapterSet => ({
  video: {
    seek: vi.fn(),
    pause: vi.fn(),
    getMetadata: vi.fn(),
    captureFrame: vi.fn(),
    getStoryboardSpec: vi.fn()
  } as unknown as VideoAdapter,
  gif: {
    isSupported: vi.fn().mockResolvedValue(true),
    createGif: vi.fn(),
    abortGif: vi.fn(),
    reset: vi.fn(),
    setCallbacks: vi.fn(),
    destroy: vi.fn()
  } as unknown as GifAdapter,
  storage: {
    get: vi.fn(),
    set: vi.fn()
    // Add others
  } as unknown as StorageAdapter,
  getVideoTitle: vi.fn().mockResolvedValue('Test Video')
});

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  adapters?: Partial<AdapterSet>;
};

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { adapters, ...renderOptions } = options || {};
  const mockAdapters = { ...createMockAdapters(), ...adapters };

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AdapterContext.Provider value={mockAdapters as AdapterSet}>
      {children}
    </AdapterContext.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export * from '@testing-library/react';
export { customRender as render };
