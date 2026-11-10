import { Injectable } from '@angular/core';

type CheckinDetails = {
  ip: string | null;
  userAgent: string;
  deviceModel: string;
  screenResolution: string;
  language: string;
};

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {
  private cachedIp: string | null = null;
  private checkinDetails?: Promise<CheckinDetails>;

  getCheckinDetails(): Promise<CheckinDetails> {
    if (!this.checkinDetails) {
      this.checkinDetails = this.collectCheckinDetails().catch(error => {
        this.checkinDetails = undefined;
        throw error;
      });
    }
    return this.checkinDetails;
  }

  private async collectCheckinDetails(): Promise<CheckinDetails> {
    const userAgent = this.getUserAgent();
    const screenResolution = this.getScreenResolution();
    const language = this.getLanguage();
    const [ip, deviceModel] = await Promise.all([
      this.withDeadline(this.getIp(), null, 'IP'),
      this.withDeadline(this.getDeviceModel(), '', 'modelo do dispositivo'),
    ]);
    return { ip, deviceModel, userAgent, screenResolution, language };
  }

  private async withDeadline<T>(value: Promise<T>, fallback: T, label: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<T>(resolve => {
      timeout = setTimeout(() => {
        console.warn(`Tempo esgotado ao coletar ${label} para o histórico.`);
        resolve(fallback);
      }, 1200);
    });
    try {
      return await Promise.race([value, deadline]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

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

  async getDeviceModel(): Promise<string> {
    try {
      const uaData = (navigator as any).userAgentData;
      if (uaData?.getHighEntropyValues) {
        const hints = await uaData.getHighEntropyValues([
          'model', 'platform', 'platformVersion',
        ]);
        const parts: string[] = [];
        if (hints.platform) parts.push(hints.platform);
        if (hints.platformVersion) parts.push(hints.platformVersion);
        if (hints.model) parts.push(hints.model);
        if (parts.length) return parts.join(' / ');
      }
    } catch { /* not supported */ }
    return '';
  }
}
