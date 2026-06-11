import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

type SkeletonVariant = 'text' | 'rect' | 'circle';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="skeleton-shimmer"
      [class.rounded-full]="variant === 'circle'"
      [class.rounded-xl]="variant === 'rect'"
      [class.rounded]="variant === 'text'"
      [style.width]="width"
      [style.height]="height"
    ></div>
  `,
  styles: [
    `
      @keyframes skeleton-shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
      .skeleton-shimmer {
        background: linear-gradient(
          90deg,
          rgba(229, 231, 235, 0.6) 0%,
          rgba(243, 244, 246, 1) 50%,
          rgba(229, 231, 235, 0.6) 100%
        );
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
      }
    `,
  ],
})
export class SkeletonComponent {
  /** Forma del skeleton: 'text' (línea de texto), 'rect' (bloque), 'circle' (avatar/ícono) */
  @Input() variant: SkeletonVariant = 'text';

  /** Ancho. Acepta cualquier valor CSS: '100%', '200px', '50%', '12rem' */
  @Input() width: string = '100%';

  /** Alto. Acepta cualquier valor CSS: '1rem', '80px', etc. */
  @Input() height: string = '1rem';
}
