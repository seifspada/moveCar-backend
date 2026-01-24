// src/auth/dto/verify-reset-code.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyResetCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}

