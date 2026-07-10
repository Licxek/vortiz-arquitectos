import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuarios/usuario.entity'; // ⚠️ ajusta la ruta
import { Proyecto } from '../proyectos/proyecto.entity'; // 👈 NUEVO
import { Between } from 'typeorm';
import { Cita } from '../citas/cita.entity';
import { Pagina } from '../paginas/pagina.entity';

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    @InjectRepository(Proyecto) private proyectosRepo: Repository<Proyecto>,
    @InjectRepository(Cita) private citasRepo: Repository<Cita>, // 👈 NUEVO
    @InjectRepository(Pagina) private paginasRepo: Repository<Pagina>,
  ) {}

  async obtener(userId: number) {
    const usuario = await this.usuariosRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario; // los @Exclude() filtran password/resetToken/resetTokenExpira automáticamente
  }

  async actualizar(
    userId: number,
    data: {
      nombre?: string;
      apellidos?: string;
      correo?: string;
      telefono?: string | null;
      avatar?: string | null; // 👈 NUEVO
    },
  ) {
    const usuario = await this.usuariosRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Validar que el correo no esté en uso por otro usuario
    if (data.correo && data.correo.trim().toLowerCase() !== usuario.correo) {
      const correoLimpio = data.correo.trim().toLowerCase();
      const existe = await this.usuariosRepo.findOne({
        where: { correo: correoLimpio, id: Not(userId) },
      });
      if (existe) {
        throw new BadRequestException(
          'Ese correo ya está en uso por otro usuario',
        );
      }
      usuario.correo = correoLimpio;
    }

    if (data.nombre !== undefined) usuario.nombre = data.nombre.trim();
    if (data.apellidos !== undefined) usuario.apellidos = data.apellidos.trim();
    if (data.telefono !== undefined) {
      usuario.telefono = data.telefono?.trim() || null;
    }
    if (data.avatar !== undefined) {
      // 👈 NUEVO
      usuario.avatar = data.avatar?.trim() || null;
    }

    await this.usuariosRepo.save(usuario);
    return this.obtener(userId);
  }

  async cambiarPassword(userId: number, actual: string, nueva: string) {
    if (!actual || !nueva) throw new BadRequestException('Faltan datos');
    if (nueva.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }
    if (!/[A-Z]/.test(nueva)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos una mayúscula',
      );
    }
    if (!/\d/.test(nueva)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos un número',
      );
    }

    const usuario = await this.usuariosRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const ok = await bcrypt.compare(actual, usuario.password);
    if (!ok)
      throw new UnauthorizedException('La contraseña actual no es correcta');

    usuario.password = await bcrypt.hash(nueva, 12);
    await this.usuariosRepo.save(usuario);

    return { ok: true };
  }

  async obtenerEstadisticas() {
    const [proyectosTotales, clientesResult] = await Promise.all([
      // Total de proyectos del estudio
      this.proyectosRepo.count(),

      // Clientes únicos que tienen al menos un proyecto (case insensitive)
      this.proyectosRepo
        .createQueryBuilder('p')
        .select('COUNT(DISTINCT LOWER(TRIM(p.cliente)))', 'total')
        .where('p.cliente IS NOT NULL')
        .andWhere("TRIM(p.cliente) != ''")
        .getRawOne(),
    ]);

    return {
      proyectosTotales,
      clientesAtendidos: parseInt(clientesResult?.total || '0', 10),
    };
  }
  /**
   * Obtiene métricas del mes actual para el modal de perfil del admin.
   * Consultas + citas del mes actual + páginas publicadas totales.
   */
  async obtenerMetricasMes() {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
    const ultimoDia = new Date(
      ahora.getFullYear(),
      ahora.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Primer y último día como strings para comparar con columnas type: 'date'
    const primerDiaStr = primerDia.toISOString().split('T')[0];
    const ultimoDiaStr = ultimoDia.toISOString().split('T')[0];

    const [consultas, citas, paginas] = await Promise.all([
      // Consultas del mes (todas las citas creadas este mes)
      this.citasRepo.count({
        where: { createdAt: Between(primerDia, ultimoDia) },
      }),
      // Citas con fecha_cita en el mes actual
      this.citasRepo
        .createQueryBuilder('c')
        .where('c.fecha_cita >= :desde', { desde: primerDiaStr })
        .andWhere('c.fecha_cita <= :hasta', { hasta: ultimoDiaStr })
        .getCount(),
      // Páginas publicadas (total actual, no del mes)
      this.paginasRepo.count({
        where: { estado: 'publicada' },
      }),
    ]);

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const etiquetaMes = `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`;

    return {
      consultas,
      citas,
      paginas,
      mes: etiquetaMes,
    };
  }
}
