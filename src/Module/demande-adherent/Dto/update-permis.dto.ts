import { IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePermisDto {
  @ApiPropertyOptional({ example: 'AB123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroPermis?: string;

  @ApiPropertyOptional({ example: '2020-03-10' })
  @IsOptional()
  @IsDateString()
  dateDebutValiditePermis?: string;

  @ApiPropertyOptional({ example: 'B' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  typePermis?: string;
}