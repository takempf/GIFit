import { StorageAdapter } from '@shared/adapters/types';

export class StorageAdapterProxy implements StorageAdapter {
  private adapter: StorageAdapter | null = null;

  setAdapter(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  async getWidth(): Promise<number | null> {
    return this.adapter ? this.adapter.getWidth() : null;
  }
  async setWidth(value: number): Promise<void> {
    if (this.adapter) await this.adapter.setWidth(value);
  }
  async getFps(): Promise<number | null> {
    return this.adapter ? this.adapter.getFps() : null;
  }
  async setFps(value: number): Promise<void> {
    if (this.adapter) await this.adapter.setFps(value);
  }
  async getQuality(): Promise<number | null> {
    return this.adapter ? this.adapter.getQuality() : null;
  }
  async setQuality(value: number): Promise<void> {
    if (this.adapter) await this.adapter.setQuality(value);
  }
}

export const storageAdapter = new StorageAdapterProxy();
