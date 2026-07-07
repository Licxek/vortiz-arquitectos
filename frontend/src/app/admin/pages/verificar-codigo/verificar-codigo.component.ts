import {
  Component,
  OnInit,
  ElementRef,
  ViewChildren,
  QueryList,
  OnDestroy,
  ChangeDetectorRef,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../../core/services/configuracion.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verificar-codigo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './verificar-codigo.component.html',
})
export class VerificarCodigoComponent implements OnInit, OnDestroy {
  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  configuracion: Configuracion | null = null;
  correo = '';
  digitos: string[] = ['', '', '', '', '', ''];
  cargando = false;
  errorMensaje = '';
  anio = new Date().getFullYear();

  tiempoRestante = 60;
  private intervalId?: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => {
        this.configuracion = data;
        this.cdr.markForCheck();
      },
    });

    this.route.queryParams.subscribe((params) => {
      this.correo = params['correo'] || '';
      if (!this.correo) {
        this.router.navigate(['/admin/recuperar']);
      }
    });

    this.iniciarCuentaRegresiva();
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  iniciarCuentaRegresiva() {
    this.tiempoRestante = 60;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.tiempoRestante--;
      this.cdr.markForCheck();
      if (this.tiempoRestante <= 0) {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  // ============================================================
  // GETTERS COMPUTADOS
  // ============================================================

  get nombreEmpresa(): string {
    return this.configuracion?.nombre || 'Vortiz Arquitectos';
  }

  get logoUrl(): string {
    return this.configuracion?.logo_url || '';
  }

  get tieneLogo(): boolean {
    return !!this.logoUrl;
  }

  get colorInicio(): string {
    return this.configuracion?.color_degradado_inicio || '#0a1f3d';
  }

  get colorFin(): string {
    return this.configuracion?.color_degradado_fin || '#0a4d7a';
  }

  get colorPrimario(): string {
    return this.configuracion?.color_primario || '#0a4d7a';
  }

  get gradientPanel(): string {
    return `linear-gradient(135deg, ${this.colorInicio} 0%, ${this.colorFin} 100%)`;
  }

  get gradientBoton(): string {
    return `linear-gradient(135deg, ${this.colorPrimario}, ${this.oscurecerHex(this.colorPrimario, -15)})`;
  }

  private oscurecerHex(hex: string, porcentaje: number): string {
    const s = hex.replace('#', '');
    if (s.length !== 6) return hex;
    const num = parseInt(s, 16);
    const factor = 1 + porcentaje / 100;
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // ============================================================
  // PROGRESS RING DEL TIEMPO
  // ============================================================

  get progresoTiempo(): number {
    return ((60 - this.tiempoRestante) / 60) * 100;
  }

  get strokeDashoffset(): number {
    const circumference = 2 * Math.PI * 20; // radio 20
    return circumference - (this.progresoTiempo / 100) * circumference;
  }

  get codigoCompleto(): boolean {
    return this.digitos.every((d) => d !== '');
  }

  // ============================================================
  // INPUT HANDLERS
  // ============================================================

  onInput(index: number, event: any) {
    const valor = event.target.value;

    if (!/^\d$/.test(valor)) {
      this.digitos[index] = '';
      return;
    }

    this.digitos[index] = valor;

    if (index < 5) {
      const inputs = this.digitInputs.toArray();
      inputs[index + 1].nativeElement.focus();
    }

    if (this.codigoCompleto) {
      this.verificar();
    }
  }

  onKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !this.digitos[index] && index > 0) {
      const inputs = this.digitInputs.toArray();
      inputs[index - 1].nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pegado = event.clipboardData?.getData('text').trim() || '';
    const numeros = pegado.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) {
      this.digitos[i] = numeros[i] || '';
    }
    const ultimoIndex = Math.min(numeros.length, 5);
    const inputs = this.digitInputs.toArray();
    inputs[ultimoIndex].nativeElement.focus();
    if (this.codigoCompleto) {
      this.verificar();
    }
  }

  verificar() {
    const codigo = this.digitos.join('');
    if (codigo.length !== 6) {
      this.errorMensaje = 'Ingresa los 6 dígitos del código';
      return;
    }
    this.cargando = true;
    this.errorMensaje = '';
    this.authService.verificarCodigo(this.correo, codigo).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/admin/nueva-password'], {
          queryParams: { correo: this.correo, codigo },
        });
      },
      error: (e) => {
        this.cargando = false;
        this.errorMensaje = e.error?.message || 'Código inválido o expirado.';
        this.digitos = ['', '', '', '', '', ''];
        setTimeout(() => {
          const inputs = this.digitInputs.toArray();
          if (inputs[0]) inputs[0].nativeElement.focus();
        }, 100);
      },
    });
  }

  reenviarCodigo() {
    if (this.tiempoRestante > 0) return;
    this.authService.solicitarRecuperacion(this.correo).subscribe();
    this.iniciarCuentaRegresiva();
  }

  volver() {
    this.router.navigate(['/admin/recuperar']);
  }
}
