export interface ExtractionResult {
  source: 'pdf-text' | 'ocr-image';
  texteExtrait: string;
  dateDebut: string | null;
  dateFin: string | null;
  confidence: number | null;
}