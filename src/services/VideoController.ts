import { browser } from 'wxt/browser';
import { VideoMetadata } from '@/types';

class VideoController {
  private async getActiveTabId(): Promise<number | undefined> {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    return tabs[0]?.id;
  }

  private async sendMessage(
    type: string,
    payload?: Record<string, unknown>
  ): Promise<unknown> {
    const id = await this.getActiveTabId();
    if (id) {
      try {
        return await browser.tabs.sendMessage(id, { type, ...payload });
      } catch (error) {
        // Fallback or specific error handling if needed
        console.debug('Failed to send message to active tab:', error);
        return null;
      }
    }
    return null;
  }

  async seek(time: number): Promise<void> {
    await this.sendMessage('SEEK_VIDEO', { time });
  }

  async pause(): Promise<void> {
    await this.sendMessage('PAUSE_VIDEO');
  }

  async getMetadata(): Promise<VideoMetadata | null> {
    return (await this.sendMessage(
      'GET_VIDEO_METADATA'
    )) as VideoMetadata | null;
  }

  async captureFrame(): Promise<string | null> {
    return (await this.sendMessage('CAPTURE_VISIBLE_FRAME')) as string | null;
  }
}

export const videoController = new VideoController();
