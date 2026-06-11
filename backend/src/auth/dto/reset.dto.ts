import { IsEmail, IsString, Length, MinLength, Matches } from 'class-validator';

export class ResetDto {
  @IsEmail() correo: string;
  @IsString() @Length(6, 6) codigo: string;
  @IsString()
  @MinLength(8, { message: 'Mínimo 8 caracteres' })
  @Matches(/[A-Z]/, { message: 'Debe incluir una mayúscula' })
  @Matches(/\d/, { message: 'Debe incluir un número' })
  password: string;
}