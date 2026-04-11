// update-agent.dto.ts
import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAgentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;
}
