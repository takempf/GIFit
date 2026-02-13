import { browser } from 'wxt/browser';
import { VideoMetadata } from '@shared/types';

class VideoController {
  private async getActiveTabId(): Promise<number | undefined> {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    if (tabs.length > 0) {
      return tabs[0]?.id;
    }

    // Fallback: If popup is separate window or devtools, currentWindow might not be the content window
    const fallbackTabs = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true
    });
    return fallbackTabs[0]?.id;
  }

  private async getTabInfo(tabId: number) {
    try {
      return await browser.tabs.get(tabId);
    } catch {
      return null;
    }
  }

  private async sendMessage(
    type: string,
    payload?: Record<string, unknown>
  ): Promise<unknown> {
    const id = await this.getActiveTabId();
    if (id) {
      try {
        const tabInfo = await this.getTabInfo(id);
        console.debug(
          `[VideoController] Sending ${type} to tab ${id} (${
            tabInfo?.title ?? 'unknown'
          })`
        );
        const response = await browser.tabs.sendMessage(id, {
          type,
          ...payload
        });
        console.debug(
          `[VideoController] Received response for ${type}:`,
          response
        );
        return response;
      } catch (error) {
        // Fallback or specific error handling if needed
        console.debug('Failed to send message to active tab:', error);
        return null;
      }
    } else {
      console.warn('[VideoController] No active tab found to send message');
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
