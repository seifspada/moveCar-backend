import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private bucket = 'documents';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );
  }

  async uploadFile(
    folder: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const path = `${folder}/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, fileBuffer, { contentType, upsert: true });

    if (error) throw new Error(`Upload échoué: ${error.message}`);

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return data.publicUrl; // ✅ URL publique à sauvegarder en DB
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extraire le path depuis l'URL publique
    const path = fileUrl.split(`/storage/v1/object/public/${this.bucket}/`)[1];
    if (!path) return;

    await this.supabase.storage.from(this.bucket).remove([path]);
  }
}