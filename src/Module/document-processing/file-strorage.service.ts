import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FileStorageService {
  private supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  private static readonly BUCKET = 'documents';

  /**
   * Upload un fichier temporaire vers Supabase Storage.
   * Retourne l'URL publique (remplace l'ancien filePath local).
   */
  async saveTempFile(buffer: Buffer, originalname: string): Promise<string> {
    const ext = path.extname(originalname);
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const storagePath = `temp/${fileName}`;

    const { error } = await this.supabase.storage
      .from(FileStorageService.BUCKET)
      .upload(storagePath, buffer, {
        contentType: this.getMimeType(ext),
        upsert: false,
      });

    if (error) {
      throw new Error(`saveTempFile: upload Supabase échoué: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(FileStorageService.BUCKET)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  /**
   * Supprime un fichier depuis Supabase Storage via son URL publique.
   * Remplace l'ancien fs.unlink().
   */
  async deleteFile(publicUrl: string): Promise<void> {
    const storagePath = this.extractStoragePath(publicUrl);
    if (!storagePath) return;

    await this.supabase.storage
      .from(FileStorageService.BUCKET)
      .remove([storagePath])
      .catch(() => undefined); // même comportement que l'ancien .catch(() => undefined)
  }

  // ================== HELPERS ==================

  private extractStoragePath(publicUrl: string): string | null {
    const marker = `/object/public/${FileStorageService.BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      '.pdf':  'application/pdf',
      '.jpg':  'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png':  'image/png',
      '.webp': 'image/webp',
    };
    return map[ext.toLowerCase()] ?? 'application/octet-stream';
  }
}