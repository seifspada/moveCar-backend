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

      // ── RC Professionnelle ──────────────────────────────────
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

      // ── RC Circulation ──────────────────────────────────────
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

      // ── Kbis ────────────────────────────────────────────────
      case 'kbis': {
        // Tentative 1 : date numérique DD/MM/YYYY près d'un label
        let dateDebut =
          findDate([
            'a jour au',
            'mis a jour au',
            'date de mise a jour',
            'delivre le',
            'extrait du',
            'date d immatriculation',
            'immatriculation le',
            'immatriculation',
          ]);

        // ✅ Tentative 2 : date en toutes lettres ("8 octobre 2019")
        if (!dateDebut) {
          dateDebut = this.extractLiteralDate(normalized);
        }

        // Fallback : date du jour
        if (!dateDebut) {
          dateDebut = this.todayIso();
        }

        const dateFin = this.addMonths(dateDebut, 3);

        return {
          dateDebutValidite: dateDebut,
          dateFinValidite: dateFin,
          // 0.9 si date trouvée dans le doc, 0.6 si fallback date du jour
          confidence: dateDebut !== this.todayIso() ? 0.9 : 0.6,
        };
      }

      default:
        return {
          dateDebutValidite: null,
          dateFinValidite: null,
          confidence: 0.0,
        };
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private toIsoDate(value: string): string | null {
    const clean = value.replace(/[.-]/g, '/');
    const parts = clean.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (!day || !month || !year || year.length !== 4) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  private todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  private addMonths(isoDate: string, months: number): string {
    const date = new Date(`${isoDate}T00:00:00`);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  /**
   * Extrait une date écrite en toutes lettres depuis le texte OCR normalisé
   * ex : "a jour au 8 octobre 2019"  →  "2019-10-08"
   *      "8 octobre 2019"            →  "2019-10-08"
   */
  private extractLiteralDate(normalizedText: string): string | null {
    const MOIS: Record<string, string> = {
      janvier:   '01', fevrier:   '02', mars:     '03',
      avril:     '04', mai:       '05', juin:     '06',
      juillet:   '07', aout:      '08', septembre:'09',
      octobre:   '10', novembre:  '11', decembre: '12',
    };

    const moisPattern = Object.keys(MOIS).join('|');
    const regex = new RegExp(
      `(?:a jour au|mis a jour au|delivre le|au|du)?\\s*(\\d{1,2})\\s+(${moisPattern})\\s+(\\d{4})`,
      'i',
    );

    // normalizedText est déjà sans accents et en minuscules (vient de extract())
    const match = normalizedText.match(regex);
    if (!match) return null;

    const day   = match[1].padStart(2, '0');
    const month = MOIS[match[2].toLowerCase()];
    const year  = match[3];

    if (!month) return null;

    const iso = `${year}-${month}-${day}`;
    console.log(`[DateExtractor] ✅ Date littérale : "${match[0].trim()}" → ${iso}`);
    return iso;
  }
}