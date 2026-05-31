import { Injectable } from '@angular/core';

export interface NominatimResult {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
}

@Injectable({ providedIn: 'root' })
export class NominatimService {
  private lastRequestTime = 0;

  async search(query: string): Promise<NominatimResult[]> {
    if (!query || query.length < 3) return [];

    const now = Date.now();
    const wait = Math.max(0, 1000 - (now - this.lastRequestTime));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastRequestTime = Date.now();

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      viewbox: '-51.30,-29.90,-51.00,-30.25',
      bounded: '1',
      'accept-language': 'pt-BR',
    });

    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'SextouDoVolei/1.0' } }
    );
    return resp.json();
  }
}
