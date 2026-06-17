import {
  IsArray,
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ========== NEGOCIO ==========
export class NegocioDto {
  @IsString() @MaxLength(100) nombre!: string;
  @IsOptional() @IsString() @MaxLength(200) eslogan?: string;
  @IsOptional() @IsString() @MaxLength(200) direccion?: string;
  @IsOptional() @IsString() @MaxLength(80) ciudad?: string;
  @IsOptional() @IsString() @MaxLength(80) estado?: string;
  @IsOptional() @IsString() @MaxLength(20) codigoPostal?: string;
  @IsOptional() @IsString() @MaxLength(30) rfc?: string;
}

// ========== CONTACTO ==========
export class ContactoDto {
  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @IsString() @MaxLength(40) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(120) correoPublico?: string;
  @IsOptional() @IsString() @MaxLength(120) correoNotificaciones?: string;
}

// ========== APARIENCIA ==========
export class AparienciaDto {
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() logoFooterUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsHexColor() colorPrimario?: string;
  @IsOptional() @IsHexColor() colorSecundario?: string;
  @IsOptional() @IsHexColor() colorTextoNav?: string;
  @IsOptional() @IsHexColor() colorTextoFooter?: string;
  @IsOptional() @IsHexColor() degradadoInicio?: string;
  @IsOptional() @IsHexColor() degradadoFin?: string;
}

// ========== NOTIFICACIONES ==========
export class NotificacionesDto {
  @IsOptional() @IsBoolean() nuevaCita?: boolean;
  @IsOptional() @IsBoolean() resumenDiario?: boolean;
  @IsOptional() @IsBoolean() resumenSemanal?: boolean;
  @IsOptional() @IsBoolean() recordatorio24h?: boolean;
  @IsOptional() @IsBoolean() recordatorio1h?: boolean;
  @IsOptional() @IsIn(['email', 'whatsapp', 'ambos']) canalRecordatorio?: string;
}

// ========== SEO ==========
export class SeoDto {
  @IsOptional() @IsString() @MaxLength(60) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(160) metaDescription?: string;
  @IsOptional() @IsString() @MaxLength(200) keywords?: string;
  @IsOptional() @IsString() ogImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) siteUrl?: string;  // 👈 AGREGAR
}

// ========== MANTENIMIENTO ==========
export class MantenimientoDto {
  @IsBoolean() activo!: boolean;
  @IsString() @MaxLength(200) mensaje!: string;
  @IsOptional() @IsString() fechaEstimada?: string;
}

// ========== REDES (array) ==========
export class RedSocialDto {
  @IsString() @MaxLength(60) nombre!: string;
  @IsString() @MaxLength(40) icono!: string;
  @IsOptional() @IsString() @MaxLength(500) url?: string;
  @IsBoolean() activa!: boolean;
  @IsOptional() @IsString() @MaxLength(30) color?: string;
  @IsOptional() @IsBoolean() personalizada?: boolean;
}

// ========== AGENDA (con anidados) ==========
export class DiaSemanaDto {
  @IsString() nombre!: string;
  @IsString() abrev!: string;
  @IsBoolean() activo!: boolean;
}

export class DiaFeriadoDto {
  @IsInt() id!: number;
  @IsString() fecha!: string;
  @IsString() @MaxLength(120) motivo!: string;
}

export class AgendaDto {
  @IsOptional() @IsString() horaInicio?: string;
  @IsOptional() @IsString() horaFin?: string;
  @IsOptional() @IsInt() @Min(15) @Max(240) duracionCita?: number;
  @IsOptional() @IsInt() @Min(0) @Max(120) tiempoEntreCitas?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50) limiteDiario?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiaSemanaDto)
  diasSemana?: DiaSemanaDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiaFeriadoDto)
  diasFeriados?: DiaFeriadoDto[];
}