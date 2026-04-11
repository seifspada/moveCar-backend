import { Injectable, InternalServerErrorException } from '@nestjs/common';
import tesseract from 'node-tesseract-ocr';

@Injectable()
export class OcrService {
  async extractText(filePath: string): Promise<string> {
    try {
      const text = await tesseract.recognize(filePath, {
        lang: 'fra+eng',
        oem: 1,
        psm: 3,
      });
      return (text || '').trim();
    } catch {
      throw new InternalServerErrorException(
        "Échec de l'OCR sur le fichier fourni",
      );
    }
  }
}