import { Injectable } from '@angular/core';

interface CountryIsResponse {
  ip?: string;
  country?: string; // ISO 2 letras, ej. "MX"
}

interface CachePais {
  iso: string;
  expira: number;
}

@Injectable({ providedIn: 'root' })
export class GeolocalizacionService {
  private readonly CACHE_KEY = 'vortiz_pais_ip';
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  private readonly TIMEOUT_MS = 3000;
  private readonly API_URL = 'https://api.country.is/';

  private memoria: string | null = null;
  private peticionEnCurso: Promise<string | null> | null = null;

  /**
   * Detecta el país del visitante por su IP.
   * @returns ISO code lowercase (ej. 'mx', 'us', 'ar') o null si falla.
   */
  async detectarPais(): Promise<string | null> {
    if (this.memoria) return this.memoria;

    const cacheado = this.leerCache();
    if (cacheado) {
      this.memoria = cacheado;
      return cacheado;
    }

    if (this.peticionEnCurso) return this.peticionEnCurso;

    this.peticionEnCurso = this.hacerPeticion();
    const resultado = await this.peticionEnCurso;
    this.peticionEnCurso = null;
    return resultado;
  }

  private async hacerPeticion(): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(this.API_URL, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const data: CountryIsResponse = await response.json();

      // api.country.is retorna { ip, country: "MX" }
      if (data.country && data.country.length === 2) {
        const iso = data.country.toLowerCase();
        this.memoria = iso;
        this.guardarCache(iso);
        return iso;
      }
      return null;
    } catch (e) {
      console.warn('[Geolocalizacion] No se pudo detectar país por IP:', e);
      return null;
    }
  }

  private leerCache(): string | null {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;
      const cache: CachePais = JSON.parse(raw);
      if (Date.now() > cache.expira) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }
      return cache.iso;
    } catch {
      return null;
    }
  }

  private guardarCache(iso: string) {
    try {
      const cache: CachePais = {
        iso,
        expira: Date.now() + this.CACHE_TTL_MS,
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch {
      // localStorage bloqueado (incógnito strict, etc.) — ignorar
    }
  }

  limpiarCache() {
    this.memoria = null;
    localStorage.removeItem(this.CACHE_KEY);
  }
}
