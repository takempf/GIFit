import { VideoMetadata } from '@shared/types';
import { VideoAdapter } from '@shared/adapters/types';

export class VideoControllerProxy implements VideoAdapter {
  private adapter: VideoAdapter | null = null;

  setAdapter(adapter: VideoAdapter) {
    this.adapter = adapter;
  }

  async seek(timeSeconds: number): Promise<void> {
    if (this.adapter) await this.adapter.seek(timeSeconds);
  }

  async pause(): Promise<void> {
    if (this.adapter) await this.adapter.pause();
  }

  async getMetadata(): Promise<VideoMetadata | null> {
    return this.adapter ? this.adapter.getMetadata() : null;
  }

  async captureFrame(): Promise<string | null> {
    return this.adapter ? this.adapter.captureFrame() : null;
  }
}

export const videoController = new VideoControllerProxy();
