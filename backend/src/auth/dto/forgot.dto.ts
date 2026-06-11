// src/auth/dto/forgot.dto.ts
import { IsEmail } from 'class-validator';
export class ForgotDto {
  @IsEmail({}, { message: 'Correo inválido' }) correo: string;
}