import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { TipoCita , EstadoCita} from '../cita.entity';

export class CrearCitaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  nombre: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(200)
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(30)
  @Matches(/^[\d\s\+\-\(\)]+$/, {
    message: 'El teléfono solo puede contener dígitos, espacios, +, - y paréntesis',
  })
  telefono: string;

  @IsEnum(['consulta', 'proyecto'], {
    message: 'El tipo debe ser "consulta" o "proyecto"',
  })
  tipo: TipoCita;

  @IsOptional()
  @IsInt({ message: 'El servicioId debe ser un número entero' })
  servicioId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'El motivo no puede exceder 2000 caracteres' })
  motivo?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  })
  fecha: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora debe tener formato HH:MM (24 horas)',
  })
  hora: string;

  @IsOptional()
  @IsInt()
  @Min(15, { message: 'La duración mínima es de 15 minutos' })
  @Max(480, { message: 'La duración máxima es de 480 minutos (8 horas)' })
  duracion?: number;

  // 👇 NUEVO
  @IsOptional()
  @IsEnum(['pendiente', 'confirmada', 'cancelada', 'completada'], {
    message: 'El estado no es válido',
  })
  estado?: EstadoCita;
}