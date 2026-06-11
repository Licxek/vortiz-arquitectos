// src/auth/dto/verificar.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';
export class VerificarDto {
  @IsEmail() correo: string;
  @IsString() @Length(6, 6, { message: 'El código debe tener 6 dígitos' }) codigo: string;
}