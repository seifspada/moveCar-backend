import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class FileStorageService {
  async saveTempFile(buffer: Buffer, originalname: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const ext = path.extname(originalname);
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(tempDir, fileName);

    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath).catch(() => undefined);
  }
}