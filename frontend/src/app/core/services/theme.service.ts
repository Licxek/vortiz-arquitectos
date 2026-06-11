import { Injectable } from '@angular/core';
import { ConfiguracionService } from './configuracion.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  constructor(private config: ConfiguracionService) {}

  aplicar() {
    this.config.configPublica$.subscribe(c => {
      if (!c) return;
      const r = document.documentElement;
      r.style.setProperty('--color-primario', c.color_primario);
      r.style.setProperty('--color-secundario', c.color_secundario);
      r.style.setProperty('--color-texto-nav', c.color_texto_nav);
      r.style.setProperty('--color-texto-footer', c.color_texto_footer);
      r.style.setProperty('--degradado-inicio', c.color_degradado_inicio);
      r.style.setProperty('--degradado-fin', c.color_degradado_fin);
    });
  }
}
