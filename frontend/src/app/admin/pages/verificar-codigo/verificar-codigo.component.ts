import { Component, OnInit, ElementRef, ViewChildren, QueryList, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ConfiguracionService, Configuracion } from '../../../core/services/configuracion.service';

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

  // Cuenta regresiva para reenviar
  tiempoRestante = 60;
  intervalId?: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private configuracionService: ConfiguracionService
  ) {}

  ngOnInit() {
    this.configuracionService.getConfiguracion().subscribe({
      next: (data) => this.configuracion = data
    });

    this.route.queryParams.subscribe(params => {
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
    this.intervalId = setInterval(() => {
      this.tiempoRestante--;
      if (this.tiempoRestante <= 0) {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  onInput(index: number, event: any) {
    const valor = event.target.value;

    // Solo aceptar números
    if (!/^\d$/.test(valor)) {
      this.digitos[index] = '';
      return;
    }

    this.digitos[index] = valor;

    // Pasar al siguiente input
    if (index < 5) {
      const inputs = this.digitInputs.toArray();
      inputs[index + 1].nativeElement.focus();
    }

    // Si llenó todo, verificar automáticamente
    if (this.digitos.every(d => d !== '')) {
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

    // Focus en el último input lleno
    const ultimoIndex = Math.min(numeros.length, 5);
    const inputs = this.digitInputs.toArray();
    inputs[ultimoIndex].nativeElement.focus();

    if (this.digitos.every(d => d !== '')) {
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

    setTimeout(() => {
      this.cargando = false;
      // Por ahora simula que el código es correcto
      this.router.navigate(['/admin/nueva-password'], {
        queryParams: { correo: this.correo, codigo: codigo }
      });
    }, 1200);
  }

  reenviarCodigo() {
    if (this.tiempoRestante > 0) return;
    this.iniciarCuentaRegresiva();
    // Aquí iría la llamada al backend para reenviar
  }

  volver() {
    this.router.navigate(['/admin/recuperar']);
  }
}
