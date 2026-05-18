// Upload service. Laravel: UploadFileController.
//   - Accepts file upload (multipart)
//   - Uploads to MinIO ({folder: uploads, ext: pdf/docx/jpg/png})
//   - Saves to upload_files table
//   - Returns signed URL

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { upload_files } from '@/db/schema';
import { MinioService, type UploadedFile } from '@/shared/minio/minio.service';
import { BusinessException } from '@/common/exceptions/business.exception';

@Injectable()
export class UploadService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  async upload(file: UploadedFile | undefined): Promise<string> {
    if (!file) {
      throw new BusinessException(422, 'file is required');
    }

    // Laravel: uploadFormFile('uploads', ['pdf', 'docx', 'jpg', 'png']).
    const filePath = await this.minio.uploadFormFile(file, 'uploads', [
      'pdf',
      'docx',
      'jpg',
      'png',
    ]);

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';

    await this.db.insert(upload_files).values({
      file_name: file.originalname,
      file_path: filePath,
      file_extension: ext,
    });

    // Laravel: Helper::response(true, Helper::fileUrl($data['file_path'])).
    // Helper::response(true, $X) → {message: true, error: false, data: $X}.
    // Bu yerda data = signed URL.
    const url = await this.minio.fileUrl(filePath);
    return url ?? '';
  }
}
