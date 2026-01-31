import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class DebloquerDateDto {
  @ApiProperty({ 
    example: '2026-02-14', 
    description: 'Date à débloquer (format YYYY-MM-DD)' 
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;
}
