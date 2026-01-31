import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class BloquerDateDto {
  @ApiProperty({ 
    example: '2026-02-14', 
    description: 'Date à bloquer (format YYYY-MM-DD)' 
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ 
    example: 'Jour férié - Saint Valentin', 
    description: 'Motif du blocage' 
  })
  @IsNotEmpty()
  @IsString()
  motif: string;
}
