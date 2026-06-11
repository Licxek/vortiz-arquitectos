import { Component, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cargando()) {
      <div class="fixed top-0 left-0 right-0 z-[9999] h-1 pointer-events-none overflow-hidden">
        <div class="loading-bar-progress h-full bg-gradient-to-r from-transparent via-[#0a4d7a] to-transparent"></div>
      </div>
    }
  `,
  styles: [
    `
      @keyframes loading-bar {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      .loading-bar-progress {
        width: 50%;
        animation: loading-bar 1.2s ease-in-out infinite;
        box-shadow: 0 0 10px rgba(10, 77, 122, 0.5);
      }
    `,
  ],
})
export class LoadingBarComponent implements OnDestroy {
  private router = inject(Router);
  private sub: Subscription;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  cargando = signal(false);

  constructor() {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Solo mostrar la barra si la navegación tarda más de 150ms
        this.timeoutId = setTimeout(() => {
          this.cargando.set(true);
        }, 150);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        this.cargando.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}
