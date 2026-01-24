// src/auth/dto/forget-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class forgetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}