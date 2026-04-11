import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { DocumentProcessingService } from './document-processing.service';

@ApiTags('Document Processing')
@Controller('document-processing')
export class DocumentProcessingController {
  constructor(
    private readonly documentProcessingService: DocumentProcessingService,
  ) {}

  @Post('extract-dates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Extraire les dates d'un document d'assurance" })
  @ApiConsumes('multipart/form-data')
  async extractDates(@Req() req: FastifyRequest) {
    const body: any = req.body;

    const typeDocument: string =
      body?.typeDocument?.value ?? body?.typeDocument ?? '';

    if (!typeDocument) {
      throw new BadRequestException('typeDocument requis');
    }

    const fileField = body?.file;
    const fileBuffer: Buffer | undefined =
      fileField?.value instanceof Buffer ? fileField.value : undefined;
    const fileFilename: string = fileField?.filename ?? 'upload';
    const fileMimetype: string = fileField?.mimetype ?? '';

    if (!fileBuffer) {
      throw new BadRequestException('Fichier requis');
    }

    console.log('[Controller] typeDocument :', typeDocument);
    console.log('[Controller] filename :', fileFilename);
    console.log('[Controller] buffer size :', fileBuffer.length, 'bytes');

    return this.documentProcessingService.extractDates(
      fileBuffer,
      fileFilename,
      fileMimetype,
      typeDocument,
    );
  }
}