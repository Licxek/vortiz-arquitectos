import { Injectable, signal, effect } from '@angular/core';

export type ModoTema = 'claro' | 'oscuro' | 'sistema';

@Injectable({ providedIn: 'root' })
export class ModoTemaService {
  private readonly STORAGE_KEY = 'vortiz_modo_tema';

  /** Modo seleccionado por el usuario (puede ser 'sistema') */
  modoUsuario = signal<ModoTema>(this.cargarPreferencia());

  /** Modo efectivo aplicado (solo 'claro' u 'oscuro', resuelve 'sistema') */
  modoEfectivo = signal<'claro' | 'oscuro'>('oscuro');

  constructor() {
    // Aplicar modo inicial y reaccionar a cambios de preferencia
    effect(() => {
      const preferencia = this.modoUsuario();
      const efectivo = this.resolverModo(preferencia);
      this.modoEfectivo.set(efectivo);
      this.aplicarModo(efectivo);
      localStorage.setItem(this.STORAGE_KEY, preferencia);
    });

    // Escuchar cambios en la preferencia del sistema
    if (typeof window !== 'undefined' && window.matchMedia) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
          if (this.modoUsuario() === 'sistema') {
            const efectivo = this.resolverModo('sistema');
            this.modoEfectivo.set(efectivo);
            this.aplicarModo(efectivo);
          }
        });
    }
  }

  cambiarModo(nuevo: ModoTema): void {
    this.modoUsuario.set(nuevo);
  }

  alternarModo(): void {
    this.cambiarModo(this.modoEfectivo() === 'oscuro' ? 'claro' : 'oscuro');
  }

  private cargarPreferencia(): ModoTema {
    if (typeof localStorage === 'undefined') return 'oscuro';
    const guardado = localStorage.getItem(this.STORAGE_KEY) as ModoTema | null;
    if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'sistema') {
      return guardado;
    }
    return 'oscuro';
  }

  private resolverModo(preferencia: ModoTema): 'claro' | 'oscuro' {
    if (preferencia === 'sistema') {
      return typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'oscuro'
        : 'claro';
    }
    return preferencia;
  }

  private aplicarModo(modo: 'claro' | 'oscuro'): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (modo === 'oscuro') {
      html.classList.add('dark');
      html.setAttribute('data-tema', 'oscuro');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-tema', 'claro');
    }
  }
}
