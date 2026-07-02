import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
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
import * as fs from 'fs/promises';

@Injectable()
export class ConfiguracionService implements OnModuleInit {
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

    // 👇 NUEVO: actualizar index.html cuando cambien meta tags
    if (seccion === 'seo' || seccion === 'negocio') {
      this.actualizarIndexHtml().catch(() => {});
    }

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
    // 👇 NUEVO: validar horarios por día si tienen override
    for (const dia of datos.diasSemana || []) {
      if (!dia.activo) continue;

      const tieneInicio = !!(dia.horaInicio && dia.horaInicio.trim());
      const tieneFin = !!(dia.horaFin && dia.horaFin.trim());

      if (tieneInicio !== tieneFin) {
        throw new BadRequestException(
          `${dia.nombre}: si defines un horario propio, debes especificar tanto inicio como fin.`,
        );
      }

      if (tieneInicio && tieneFin) {
        const [hIDia, mIDia] = dia.horaInicio.split(':').map(Number);
        const [hFDia, mFDia] = dia.horaFin.split(':').map(Number);
        const inicioDiaMin = hIDia * 60 + mIDia;
        const finDiaMin = hFDia * 60 + mFDia;
        const totalDia = finDiaMin - inicioDiaMin;

        if (totalDia <= 0) {
          throw new BadRequestException(
            `${dia.nombre}: la hora de cierre debe ser posterior a la de apertura.`,
          );
        }
        if (datos.duracionCita > totalDia) {
          throw new BadRequestException(
            `${dia.nombre}: una cita de ${datos.duracionCita} min no cabe en su horario (${dia.horaInicio}–${dia.horaFin}).`,
          );
        }
      }
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
    const agenda: any = c.agenda || {};

    const redesPublicas = redes
      .filter((r) => r.activa && r.url)
      .slice(0, 4)
      .map((r) => ({ nombre: r.nombre, icono: r.icono, url: r.url }));

    // Generar horario dinámico basado en días laborales reales
    const diasActivos: any[] = (agenda.diasSemana || []).filter(
      (d: any) => d.activo,
    );
    let horarioTexto = `Lun - Vie ${agenda.horaInicio || '09:00'} - ${agenda.horaFin || '18:00'}`;
    if (diasActivos.length > 0) {
      const primerDia = diasActivos[0].abrev || diasActivos[0].nombre;
      const ultimoDia =
        diasActivos.length > 1
          ? diasActivos[diasActivos.length - 1].abrev ||
            diasActivos[diasActivos.length - 1].nombre
          : primerDia;
      horarioTexto =
        diasActivos.length === 1
          ? `${primerDia} ${agenda.horaInicio || '09:00'} - ${agenda.horaFin || '18:00'}`
          : `${primerDia} - ${ultimoDia} ${agenda.horaInicio || '09:00'} - ${agenda.horaFin || '18:00'}`;
    }

    return {
      id: c.id,
      logo_url: c.apariencia?.logoUrl || '/assets/img/logo.png',
      logo_footer_url:
        c.apariencia?.logoFooterUrl || '/assets/img/logo_vortiz.png',
      favicon_url: c.apariencia?.faviconUrl || '/assets/img/logo.ico',
      telefono: c.contacto?.telefono || '',
      whatsapp: c.contacto?.whatsapp || '', // 👈 NUEVO campo para el número de WhatsApp
      correo_contacto: c.contacto?.correoPublico || '',
      direccion: c.negocio?.direccion || '',
      // 👇 NUEVO: campos individuales de dirección para composición flexible en frontend
      ciudad: c.negocio?.ciudad || '',
      estado: c.negocio?.estado || '',
      codigo_postal: c.negocio?.codigoPostal || '',
      redes: redesPublicas,
      horario: horarioTexto,
      color_primario: c.apariencia?.colorPrimario || '#0a4d7a',
      color_secundario: c.apariencia?.colorSecundario || '#0a1f3d',
      color_texto_nav: c.apariencia?.colorTextoNav || '#ffffff',
      color_texto_footer: c.apariencia?.colorTextoFooter || '#ffffff',
      color_degradado_inicio: c.apariencia?.degradadoInicio || '#000000',
      color_degradado_fin: c.apariencia?.degradadoFin || '#0a1f3d',
      meta_title: c.seo?.metaTitle || 'Vortiz Arquitectos',
      meta_description: c.seo?.metaDescription || '',
      meta_keywords: c.seo?.keywords || '',
      og_image_url: c.seo?.ogImageUrl || '',
      nombre: c.negocio?.nombre || 'Vortiz Arquitectos',
      eslogan:
        c.negocio?.eslogan || 'Diseñamos espacios, construimos confianza.',
        eslogan_footer:
        c.negocio?.esloganFooter ||
        'Firma especializada en diseño arquitectónico y gestión de proyectos.', // 👈 AGREGAR
      mantenimiento: c.mantenimiento,
      agenda: {
        diasSemana: agenda.diasSemana || [],
        diasFeriados: agenda.diasFeriados || [],
        horaInicio: agenda.horaInicio || '09:00',
        horaFin: agenda.horaFin || '18:00',
      },
    };
  }
  private readonly INDEX_PATH = '/app/frontend-dist/index.html';
  private readonly logger = new Logger('ConfiguracionService'); // si no lo tienes

  /** Reescribe los meta tags del index.html con la config actual */
  private async actualizarIndexHtml() {
    try {
      let html = await fs.readFile(this.INDEX_PATH, 'utf-8');
      const config = await this.obtener();
      const seo: any = config.seo || {};
      const negocio: any = config.negocio || {};

      const nombre = negocio.nombre || 'Vortiz Arquitectos';
      const titulo = seo.metaTitle || nombre;
      const descripcion = seo.metaDescription || '';
      const imagen = seo.ogImageUrl || '';
      const keywords = seo.keywords || '';

      const reemplazos: Array<[string, 'name' | 'property', string]> = [
        ['description', 'name', descripcion],
        ['keywords', 'name', keywords],
        ['og:title', 'property', titulo],
        ['og:description', 'property', descripcion],
        ['og:image', 'property', imagen],
        ['og:site_name', 'property', nombre],
        ['twitter:title', 'name', titulo],
        ['twitter:description', 'name', descripcion],
        ['twitter:image', 'name', imagen],
      ];

      for (const [prop, attr, value] of reemplazos) {
        const escaped = this.escapeHtml(value);
        const regex = new RegExp(
          `<meta ${attr}="${prop}" content="[^"]*"`,
          'g',
        );
        html = html.replace(
          regex,
          `<meta ${attr}="${prop}" content="${escaped}"`,
        );
      }

      await fs.writeFile(this.INDEX_PATH, html, 'utf-8');
      this.logger.log('✅ Meta tags del index.html actualizados');
    } catch (err: any) {
      this.logger.warn(`No se pudo actualizar index.html: ${err.message}`);
    }
  }

  private escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  async onModuleInit() {
    // Reescribir index.html al startup
    await this.actualizarIndexHtml().catch(() => {});
  }
}
