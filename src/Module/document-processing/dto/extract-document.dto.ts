import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtractDocumentDto {
  @ApiProperty({
    enum: ['assuranceRcPro', 'assuranceRcCirculation'],
    description: 'Type de document à analyser',
  })
  @IsString()
  @IsIn(['assuranceRcPro', 'assuranceRcCirculation'])
  typeDocument: string;
}