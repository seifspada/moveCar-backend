import { Injectable, InternalServerErrorException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfReaderService {
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return (data.text || '').trim();
    } catch {
      throw new InternalServerErrorException(
        'Impossible de lire le contenu du PDF',
      );
    }
  }
}