import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {
  private cachedIp: string | null = null;

  async getIp(): Promise<string | null> {
    if (this.cachedIp) return this.cachedIp;
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      this.cachedIp = data.ip;
      return this.cachedIp;
    } catch {
      return null;
    }
  }

  getUserAgent(): string {
    return navigator.userAgent;
  }

  getScreenResolution(): string {
    return `${screen.width}x${screen.height}`;
  }

  getLanguage(): string {
    return navigator.language;
  }
}
