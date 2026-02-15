import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './appStore';
import { act } from '@testing-library/react';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    vi.restoreAllMocks();
  });

  it('should have initial state', () => {
    const state = useAppStore.getState();
    expect(state.videoId).toBeNull();
    expect(state.status).toBe('configuring');
  });

  it('should set videoId', () => {
    act(() => {
      useAppStore.getState().setVideoId('123');
    });
    expect(useAppStore.getState().videoId).toBe('123');
  });

  it('should set status', () => {
    act(() => {
      useAppStore.getState().setStatus('generating');
    });
    expect(useAppStore.getState().status).toBe('generating');
  });

  it('should use startViewTransition if available when setting status', () => {
    const startViewTransitionMock = vi.fn((callback) => callback());
    vi.stubGlobal('document', { startViewTransition: startViewTransitionMock });

    act(() => {
      useAppStore.getState().setStatus('generated');
    });

    expect(startViewTransitionMock).toHaveBeenCalled();
    expect(useAppStore.getState().status).toBe('generated');

    vi.unstubAllGlobals();
  });

  it('should reset state', () => {
    act(() => {
      useAppStore.getState().setVideoId('123');
      useAppStore.getState().setStatus('generated');
      useAppStore.getState().reset();
    });

    const state = useAppStore.getState();
    expect(state.videoId).toBeNull();
    expect(state.status).toBe('configuring');
  });

  it('should reset with partial state', () => {
    act(() => {
      useAppStore.getState().setVideoId('123');
      useAppStore.getState().reset({ status: 'generating' });
    });

    const state = useAppStore.getState();
    expect(state.videoId).toBeNull();
    expect(state.status).toBe('generating');
  });
});
