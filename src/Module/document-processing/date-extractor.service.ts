import { Injectable } from '@nestjs/common';

export interface DateExtractionResult {
  dateDebutValidite: string | null;
  dateFinValidite: string | null;
  confidence: number;
}

@Injectable()
export class DateExtractorService {
  extract(typeDocument: string, text: string): DateExtractionResult {
    const normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

    const findDate = (keywords: string[]): string | null => {
      for (const keyword of keywords) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(
          `${escaped}\\s*[:\\-]?\\s*(\\d{2}[\\/.-]\\d{2}[\\/.-]\\d{4})`,
          'i',
        );
        const match = normalized.match(regex);
        if (match?.[1]) return this.toIsoDate(match[1]);
      }
      return null;
    };

    switch (typeDocument) {
      case 'assuranceRcPro':
        return {
          dateDebutValidite: findDate([
            'date d effet',
            'prise d effet',
            'a compter du',
            'debut de garantie',
            'du',
          ]),
          dateFinValidite: findDate([
            'date d expiration',
            'date d echeance',
            'echeance',
            'expire le',
            'valable jusqu au',
            'jusqu au',
            'au',
          ]),
          confidence: 0.85,
        };

      case 'assuranceRcCirculation':
        return {
          dateDebutValidite: findDate([
            'date d effet',
            'prise d effet',
            'a compter du',
            'valable a partir du',
            'du',
          ]),
          dateFinValidite: findDate([
            'date d expiration',
            'date d echeance',
            'echeance',
            'expire le',
            'valable jusqu au',
            'jusqu au',
            'au',
          ]),
          confidence: 0.85,
        };

      default:
        return {
          dateDebutValidite: null,
          dateFinValidite: null,
          confidence: 0.0,
        };
    }
  }

  private toIsoDate(value: string): string | null {
    const clean = value.replace(/[.-]/g, '/');
    const parts = clean.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (!day || !month || !year || year.length !== 4) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}