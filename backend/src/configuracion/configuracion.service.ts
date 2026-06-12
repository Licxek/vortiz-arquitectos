import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Configuracion } from './configuracion.entity';
import {
  NegocioDto,
  ContactoDto,
  AparienciaDto,
  NotificacionesDto,
  SeoDto,
  MantenimientoDto,
  AgendaDto,
  RedSocialDto,
} from './dto/secciones.dto';

@Injectable()
export class ConfiguracionService {
  private readonly secciones = [
    'negocio',
    'contacto',
    'redes',
    'agenda',
    'apariencia',
    'notificaciones',
    'seo',
    'mantenimiento',
  ];

  /** Mapea cada sección a su DTO para validación */
  private readonly dtoMap: Record<string, any> = {
    negocio: NegocioDto,
    contacto: ContactoDto,
    apariencia: AparienciaDto,
    notificaciones: NotificacionesDto,
    seo: SeoDto,
    mantenimiento: MantenimientoDto,
    agenda: AgendaDto,
    // 'redes' se valida elemento por elemento (es array)
  };

  constructor(
    @InjectRepository(Configuracion) private repo: Repository<Configuracion>,
  ) {}

  async obtener(): Promise<Configuracion> {
    let config = await this.repo.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.repo.create({ id: 1 });
      await this.repo.save(config);
    }
    return config;
  }

  async actualizarSeccion(seccion: string, datos: any) {
    if (!this.secciones.includes(seccion)) {
      throw new BadRequestException('Sección de configuración inválida');
    }

    await this.validarShape(seccion, datos);

    // 👇 NUEVO: validar coherencia para agenda
    if (seccion === 'agenda') {
      this.validarCoherenciaAgenda(datos);
    }

    const config = await this.obtener();
    (config as any)[seccion] = datos;
    await this.repo.save(config);
    return { message: 'Guardado', [seccion]: datos };
  }

  /** Valida el body con class-validator según la sección */
  private async validarShape(seccion: string, datos: any) {
    // 'redes' es array → valida cada item
    if (seccion === 'redes') {
      if (!Array.isArray(datos)) {
        throw new BadRequestException('redes debe ser un array');
      }
      for (let i = 0; i < datos.length; i++) {
        const instance = plainToInstance(RedSocialDto, datos[i]);
        const errors = await validate(instance);
        if (errors.length > 0) {
          throw new BadRequestException({
            message: `Red social #${i + 1} inválida`,
            errors: this.formatearErrores(errors),
          });
        }
      }
      return;
    }

    const DtoClass = this.dtoMap[seccion];
    if (!DtoClass) return; // sin DTO mapeado, sin validación

    const instance = plainToInstance(DtoClass, datos);
    const errors = await validate(instance);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: `Datos de "${seccion}" inválidos`,
        errors: this.formatearErrores(errors),
      });
    }
  }

  private validarCoherenciaAgenda(datos: any) {
    if (!datos.horaInicio || !datos.horaFin) {
      throw new BadRequestException('Debes definir hora de inicio y fin.');
    }
    const [hI, mI] = datos.horaInicio.split(':').map(Number);
    const [hF, mF] = datos.horaFin.split(':').map(Number);
    const inicioMin = hI * 60 + mI;
    const finMin = hF * 60 + mF;
    const total = finMin - inicioMin;

    if (total <= 0) {
      throw new BadRequestException(
        'La hora de cierre debe ser posterior a la de apertura.',
      );
    }
    if (!datos.duracionCita || datos.duracionCita <= 0) {
      throw new BadRequestException('La duración de cita debe ser mayor a 0.');
    }
    if (datos.duracionCita > total) {
      throw new BadRequestException(
        `Una cita de ${datos.duracionCita} min no cabe en el horario configurado.`,
      );
    }
    if (datos.tiempoEntreCitas < 0) {
      throw new BadRequestException(
        'El tiempo entre citas no puede ser negativo.',
      );
    }
    if (
      !Array.isArray(datos.diasSemana) ||
      !datos.diasSemana.some((d: any) => d.activo)
    ) {
      throw new BadRequestException('Debes activar al menos un día laboral.');
    }
  }

  /** Aplana los errores de class-validator para que sean legibles */
  private formatearErrores(errors: ValidationError[]): any {
    return errors.map((err) => ({
      campo: err.property,
      restricciones: err.constraints,
      hijos: err.children?.length
        ? this.formatearErrores(err.children)
        : undefined,
    }));
  }

  async obtenerPublica() {
    const c = await this.obtener();
    const redes: any[] = c.redes || [];

    const redesPublicas = redes
      .filter((r) => r.activa && r.url)
      .slice(0, 4)
      .map((r) => ({ nombre: r.nombre, icono: r.icono, url: r.url }));

    return {
      id: c.id,
      logo_url: c.apariencia?.logoUrl || '/assets/img/logo.png',
      logo_footer_url:
        c.apariencia?.logoFooterUrl || '/assets/img/logo_vortiz.png',
      favicon_url: c.apariencia?.faviconUrl || '/assets/img/logo.ico',
      telefono: c.contacto?.telefono || '',
      correo_contacto: c.contacto?.correoPublico || '',
      direccion: c.negocio?.direccion || '',
      redes: redesPublicas,
      horario: `Lun - Vie ${c.agenda?.horaInicio || '09:00'} - ${c.agenda?.horaFin || '18:00'}`,
      color_primario: c.apariencia?.colorPrimario || '#0a4d7a',
      color_secundario: c.apariencia?.colorSecundario || '#0a1f3d',
      color_texto_nav: c.apariencia?.colorTextoNav || '#ffffff',
      color_texto_footer: c.apariencia?.colorTextoFooter || '#ffffff',
      color_degradado_inicio: c.apariencia?.degradadoInicio || '#000000',
      color_degradado_fin: c.apariencia?.degradadoFin || '#0a1f3d',
      meta_title: c.seo?.metaTitle || 'Vortiz Arquitectos',
      meta_description: c.seo?.metaDescription || '',
      meta_keywords: c.seo?.keywords || '',
      nombre: c.negocio?.nombre || 'Vortiz Arquitectos',
      eslogan:
        c.negocio?.eslogan || 'Diseñamos espacios, construimos confianza.',
      mantenimiento: c.mantenimiento,
    };
  }
}
