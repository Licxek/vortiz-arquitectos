import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appContador]',
  standalone: true,
})
export class ContadorDirective implements OnInit, OnDestroy {
  @Input('appContador') valorObjetivo = '';
  @Input() duracionMs = 1500;

  private element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;
  private animado = false;

  ngOnInit() {
    const partes = this.parsear(this.valorObjetivo);
    if (partes.numero === null) {
      // No es numérico (ej. "Premium") → muestra el valor tal cual
      this.element.nativeElement.textContent = this.valorObjetivo;
      return;
    }

    // Empieza en 0
    this.element.nativeElement.textContent = `${partes.prefijo}0${partes.sufijo}`;

    // Observa cuándo entra al viewport
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.animado) {
          this.animado = true;
          this.animar(partes.prefijo, partes.numero!, partes.sufijo);
          this.observer?.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private parsear(valor: string): { prefijo: string; numero: number | null; sufijo: string } {
    const match = String(valor || '').match(/^(\D*)(\d+)(.*)$/);
    if (!match) return { prefijo: '', numero: null, sufijo: '' };
    return {
      prefijo: match[1] || '',
      numero: parseInt(match[2], 10),
      sufijo: match[3] || '',
    };
  }

  private animar(prefijo: string, objetivo: number, sufijo: string) {
    const inicio = performance.now();
    const frame = (ahora: number) => {
      const progreso = Math.min((ahora - inicio) / this.duracionMs, 1);
      const t = 1 - Math.pow(1 - progreso, 4); // easeOutQuart (más natural)
      const actual = Math.floor(objetivo * t);
      this.element.nativeElement.textContent = `${prefijo}${actual}${sufijo}`;
      if (progreso < 1) requestAnimationFrame(frame);
      else this.element.nativeElement.textContent = `${prefijo}${objetivo}${sufijo}`;
    };
    requestAnimationFrame(frame);
  }
}
