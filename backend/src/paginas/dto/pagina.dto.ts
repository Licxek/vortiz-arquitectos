import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  Length,
  ValidateNested,
  IsObject,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  BloquePagina,
  EstadoPagina,
  SeoPagina,
  VisibilidadPagina,
} from '../pagina.entity';
import { PartialType } from '@nestjs/mapped-types';

class SeoDto implements SeoPagina {
  @IsString()
  @Length(0, 60)
  metaTitle: string;

  @IsString()
  @Length(0, 160)
  metaDescription: string;

  @IsString()
  @Length(0, 300)
  keywords: string;
}

export class CrearPaginaDto {
  @IsString()
  @Length(1, 150)
  titulo: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  slug?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  imagenDestacada?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsIn(['borrador', 'publicada', 'programada'])
  estado?: EstadoPagina;

  @IsOptional()
  @IsIn(['publica', 'registrados', 'contrasena'])
  visibilidad?: VisibilidadPagina;

  @IsOptional()
  @IsBoolean()
  mostrarEnMenu?: boolean;

  @IsOptional()
  @IsInt()
  posicionMenu?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsArray()
  bloques?: BloquePagina[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @IsOptional()
  @IsBoolean()
  permitirComentarios?: boolean;

  @IsOptional()
  @IsString()
  icono?: string;

  @IsOptional()
  @IsString()
  color?: string;

  // 👇 NUEVO
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  notasInternas?: string;

  // 👇 NUEVO — Programación de publicación
  @IsOptional()
  @IsDateString()
  fechaPublicacion?: string;
}

export class ActualizarPaginaDto extends PartialType(CrearPaginaDto) {}
