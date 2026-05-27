import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './configuracion.entity';

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
  ];

  constructor(
    @InjectRepository(Configuracion) private repo: Repository<Configuracion>,
  ) {}

  // Siempre la fila id = 1
  async obtener(): Promise<Configuracion> {
    let config = await this.repo.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.repo.create({ id: 1 });
      await this.repo.save(config);
    }
    return config;
  }

  // Guarda una sección concreta (valida que sea una permitida)
  async actualizarSeccion(seccion: string, datos: any) {
    if (!this.secciones.includes(seccion)) {
      throw new BadRequestException('Sección de configuración inválida');
    }
    const config = await this.obtener();
    (config as any)[seccion] = datos;
    await this.repo.save(config);
    return { message: 'Guardado', [seccion]: datos };
  }

  // Subconjunto plano para el sitio público (no expone RFC, correo de alertas, etc.)
  async obtenerPublica() {
    const c = await this.obtener();
    const redes: any[] = c.redes || [];

    // Solo activas con URL, máximo 4 (lo que se muestra en el footer)
    const redesPublicas = redes
      .filter((r) => r.activa && r.url)
      .slice(0, 4)
      .map((r) => ({ nombre: r.nombre, icono: r.icono, url: r.url }));

    return {
      id: c.id,
      logo_url: c.apariencia?.logoUrl || '/assets/img/logo.png',
      logo_footer_url: c.apariencia?.logoFooterUrl || '/assets/img/logo_vortiz.png',
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
      eslogan: c.negocio?.eslogan || 'Diseñamos espacios, construimos confianza.',
    };
  }
}
