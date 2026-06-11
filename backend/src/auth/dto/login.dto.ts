// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Correo inválido' }) correo: string;
  @IsString() @MinLength(6) password: string;
}