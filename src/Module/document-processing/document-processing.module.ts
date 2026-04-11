import { Module } from '@nestjs/common';
import { DocumentProcessingController } from './document-processing.controller';
import { DocumentProcessingService } from './document-processing.service';
import { FileStorageService } from './file-strorage.service';
import { PdfReaderService } from './pdf-reader.service';
import { OcrService } from './ocr.service';
import { DateExtractorService } from './date-extractor.service';

@Module({
  controllers: [DocumentProcessingController],
  providers: [
    DocumentProcessingService,
    FileStorageService,
    PdfReaderService,
    OcrService,
    DateExtractorService,
  ],
  exports: [DocumentProcessingService], 
})
export class DocumentProcessingModule {}