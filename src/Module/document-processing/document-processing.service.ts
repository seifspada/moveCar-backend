import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class DocumentProcessingService {

  async extractDates(
    fileBuffer: Buffer,
    fileFilename: string,
    fileMimetype: string,
    typeDocument: string,
  ): Promise<any> {
    let texteExtrait = '';

    const isImage =
      fileMimetype.startsWith('image/') ||
      !!fileFilename.match(/\.(jpg|jpeg|png|tiff|bmp|webp)$/i);

    if (isImage) {
      texteExtrait = await this.extractTextFromImage(fileBuffer);
    } else {
      // Étape 1 — pdf-parse
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fileBuffer);
        texteExtrait = data.text ?? '';
        console.log('[OCR] pdf-parse longueur :', texteExtrait.length);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[OCR] pdf-parse échoué :', msg);
      }

      // Étape 2 — PDF image → PNG → Tesseract
      if (texteExtrait.trim().length < 50) {
        console.warn('[OCR] Texte trop court — conversion PDF → image → Tesseract');
        texteExtrait = await this.extractTextFromPdfAsImage(fileBuffer);
      }
    }

    if (!texteExtrait.trim()) {
      throw new InternalServerErrorException(
        'Impossible de lire le contenu du document',
      );
    }

    console.log('[OCR] Aperçu final :', texteExtrait.slice(0, 400));
    return this.parseDatesFromText(texteExtrait, typeDocument);
  }

  // ── Tesseract pour images (JPG/PNG/WEBP) ─────────────────────
  private async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    let worker: any = null;
    try {
      const { createWorker } = require('tesseract.js');
      console.log('[OCR] Tesseract image démarrage...');
      worker = await createWorker('fra', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Tesseract : ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const { data: { text } } = await worker.recognize(imageBuffer);
      console.log('[OCR] Tesseract OK — longueur :', text.length);
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[OCR] Tesseract échoué :', msg);
      return '';
    } finally {
      if (worker) await worker.terminate();
    }
  }

  // ── PDF image → PNG buffer → Tesseract ───────────────────────
  private async extractTextFromPdfAsImage(pdfBuffer: Buffer): Promise<string> {
    let worker: any = null;
    try {
      const { pdf } = await import('pdf-to-img');
      console.log('[OCR] pdf-to-img conversion page 1...');

      const document = await pdf(pdfBuffer, { scale: 2 });
      const pageImageBuffer = await document.getPage(1);
      console.log('[OCR] pdf-to-img OK — taille image :', pageImageBuffer.length, 'bytes');

      const { createWorker } = require('tesseract.js');
      worker = await createWorker('fra', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Tesseract PDF-img : ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const { data: { text } } = await worker.recognize(pageImageBuffer);
      console.log('[OCR] Tesseract PDF-img OK — longueur :', text.length);
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[OCR] pdf-to-img/Tesseract échoué :', msg);
      return '';
    } finally {
      if (worker) await worker.terminate();
    }
  }

  // ── Helpers dates ─────────────────────────────────────────────
  private addMonths(isoDate: string, months: number): string {
    const date = new Date(`${isoDate}T00:00:00`);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  private todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Extrait une date en toutes lettres depuis le texte OCR normalisé
   * ex : "a jour au 8 octobre 2019" → "2019-10-08"
   */
  private extractLiteralDate(texteNorm: string): string | null {
    const MOIS: Record<string, string> = {
      janvier: '01', fevrier: '02', mars:      '03',
      avril:   '04', mai:     '05', juin:      '06',
      juillet: '07', aout:    '08', septembre: '09',
      octobre: '10', novembre:'11', decembre:  '12',
    };

    const moisPattern = Object.keys(MOIS).join('|');
    const regex = new RegExp(
      `(?:a jour au|mis a jour au|delivre le|au|du)?\\s*(\\d{1,2})\\s+(${moisPattern})\\s+(\\d{4})`,
      'i',
    );

    // texteNorm est déjà sans accents et en minuscules
    const normalized = texteNorm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const match = normalized.match(regex);
    if (!match) return null;

    const day   = match[1].padStart(2, '0');
    const month = MOIS[match[2].toLowerCase()];
    const year  = match[3];

    if (!month) return null;

    const iso = `${year}-${month}-${day}`;
    console.log(`[OCR] ✅ Date littérale : "${match[0].trim()}" → ${iso}`);
    return iso;
  }

  // ── Parsing des dates ─────────────────────────────────────────
  private parseDatesFromText(texte: string, typeDocument: string) {

    const toIso = (ddmmyyyy: string): string => {
      const [d, m, y] = ddmmyyyy.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    };

    const texteNorm = texte
      .replace(/[\u2019\u2018\u0060\u00b4]/g, '\u0027')
      .replace(/\u00a0/g, ' ')
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .replace(/\r\n/g, '\n');

    const allMatches = [...texteNorm.matchAll(/([0-9]{2}\/[0-9]{2}\/[0-9]{4})/g)];
    const allDates = allMatches.map(m => ({
      raw: m[1],
      iso: toIso(m[1]),
      index: m.index!,
    }));
    console.log('[OCR] Dates trouvées :', allDates);

    const findDateNearLabel = (labels: string[]): string | null => {
      for (const label of labels) {
        const labelIdx = texteNorm.toLowerCase().indexOf(label.toLowerCase());
        if (labelIdx === -1) continue;
        const nearest = allDates.find(
          d => d.index > labelIdx && d.index < labelIdx + 150,
        );
        if (nearest) {
          console.log(`[OCR] ✅ "${label}" @ ${labelIdx} → ${nearest.raw}`);
          return nearest.iso;
        }
      }
      return null;
    };

    const findPeriode = (
      patterns: string[],
    ): { debut: string; fin: string } | null => {
      for (const pattern of patterns) {
        const regex = new RegExp(
          pattern +
            '[^0-9]*([0-9]{2}/[0-9]{2}/[0-9]{4})[^0-9]*([0-9]{2}/[0-9]{2}/[0-9]{4})',
          'i',
        );
        const match = texteNorm.match(regex);
        if (match) {
          console.log(`[OCR] ✅ Période "${pattern}" → ${match[1]} / ${match[2]}`);
          return { debut: toIso(match[1]), fin: toIso(match[2]) };
        }
      }
      return null;
    };

    let dateDebut: string | null = null;
    let dateFin: string | null = null;

    switch (typeDocument) {

      // ── RC Professionnelle ────────────────────────────────────
      case 'assuranceRcPro': {
        const periode = findPeriode([
          'valable[^0-9]*',
          'p[e\u00e9]riode[^\n]*',
          'validit[e\u00e9][^0-9]*',
        ]);
        if (periode) { dateDebut = periode.debut; dateFin = periode.fin; break; }
        dateDebut = findDateNearLabel([
          'pris effet le',
          'date d\u0027effet',
          'date effet',
          'd\u00e9but de garantie',
          'prise d\u0027effet',
        ]);
        dateFin = findDateNearLabel([
          '\u00e9ch\u00e9ance',
          'echeance',
          'date de fin',
          'date fin',
          'date d\u0027expiration',
          'expiration',
        ]);
        break;
      }

      // ── RC Circulation ────────────────────────────────────────
      case 'assuranceRcCirculation': {
        const periode = findPeriode([
          'valable[^0-9]*',
          'p[e\u00e9]riode[^\n]*',
          'validit[e\u00e9][^0-9]*',
        ]);
        if (periode) { dateDebut = periode.debut; dateFin = periode.fin; break; }
        dateDebut = findDateNearLabel([
          'pris effet le',
          'date d\u0027effet',
          'date effet',
          'd\u00e9but de garantie',
          'prise d\u0027effet',
        ]);
        dateFin = findDateNearLabel([
          'date d\u0027expiration',
          'date expiration',
          'expiration',
          '\u00e9ch\u00e9ance',
          'echeance',
          'date de fin',
          'date fin',
        ]);
        break;
      }

      // ── Kbis ──────────────────────────────────────────────────
      case 'kbis': {
        // Tentative 1 : date numérique DD/MM/YYYY près d'un label
        dateDebut = findDateNearLabel([
          'a jour au',
          'mis a jour au',
          'date de mise a jour',
          'delivre le',
          'extrait du',
          "date d'immatriculation",
          'immatriculation le',
          'immatriculation',
        ]);

        // ✅ Tentative 2 : date en toutes lettres ("8 octobre 2019")
        if (!dateDebut) {
          dateDebut = this.extractLiteralDate(texteNorm);
        }

        // Fallback : date du jour
        if (!dateDebut) {
          dateDebut = this.todayIso();
        }

        dateFin = this.addMonths(dateDebut, 3);
        console.log(`[OCR] Kbis → dateDebut=${dateDebut} | dateFin=${dateFin} (+3 mois)`);
        break;
      }

      default:
        throw new InternalServerErrorException(
          `Type non supporté : ${typeDocument}. ` +
          `Valeurs acceptées : assuranceRcPro, assuranceRcCirculation, kbis`,
        );
    }

    const confidence =
      typeDocument === 'kbis'
        ? (dateDebut !== this.todayIso() ? 0.9 : 0.6)
        : dateDebut && dateFin ? 0.85
        : dateDebut            ? 0.5
        : 0.0;

    console.log(
      `[OCR] type=${typeDocument} | debut=${dateDebut} | fin=${dateFin} | confidence=${confidence}`,
    );

    return { source: 'pdf-text', dateDebut, dateFin, confidence };
  }
}