import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgentDto {
  @ApiProperty({ example: 'agent@agence.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ example: 'Jean' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiPropertyOptional({ example: '+21621000000' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  agenceId: number;
}
