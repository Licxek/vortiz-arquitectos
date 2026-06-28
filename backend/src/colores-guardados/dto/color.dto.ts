import { IsString, Matches } from 'class-validator';

export class CrearColorDto {
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un hex válido (#RRGGBB)',
  })
  hex!: string;
}