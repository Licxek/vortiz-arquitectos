import { IsString, IsIn, MaxLength, IsOptional, IsInt } from 'class-validator';

export class CrearCategoriaDto {
  @IsIn(['servicio', 'proyecto'])
  tipo!: 'servicio' | 'proyecto';

  @IsString()
  @MaxLength(80)
  value!: string;

  @IsString()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}