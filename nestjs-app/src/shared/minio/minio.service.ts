// MinIO signed URL generator + file upload. Laravel: Helper::fileUrl() + Base64FileUploadTrait::uploadFormFile.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomBytes } from 'crypto';
import { BusinessException } from '@/common/exceptions/business.exception';

// Multer File interface — `Express.Multer.File`'ga mos.
export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class MinioService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'hrm-media');
    this.client = new S3Client({
      endpoint: this.config.get<string>('MINIO_ENDPOINT'),
      region: this.config.get<string>('MINIO_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY', ''),
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY', ''),
      },
      // MinIO path-style endpoint: https://endpoint/bucket/key
      forcePathStyle: true,
    });
  }

  // 30 daqiqa amal qiluvchi signed GET URL.
  async fileUrl(filePath: string | null): Promise<string | null> {
    if (!filePath) return null;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: filePath }),
      { expiresIn: 1800 },
    );
  }

  // Laravel: uploadFormFile($file, $folder, $allowedFileTypes, $filename = null, $size = 4 MB).
  // Returns: storage path (`{folder}/{hash}.{ext}`) yoki throws.
  async uploadFormFile(
    file: UploadedFile,
    folder: string,
    allowedFileTypes: string[],
    filename: string | null = null,
    maxSizeMb = 4,
  ): Promise<string> {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';

    // Validation: extension.
    if (!allowedFileTypes.includes(ext)) {
      throw new BusinessException(
        422,
        `file_not_valid (allowed: ${allowedFileTypes.join(', ')})`,
      );
    }

    // Validation: size (KB).
    const sizeKb = file.size / 1024;
    if (sizeKb > maxSizeMb * 1024) {
      throw new BusinessException(
        422,
        `maximum_file_size_exceeded (${Math.round(sizeKb)}KB > ${maxSizeMb}MB)`,
      );
    }

    // Filename — Laravel: md5(Str::random(25).random_int(1,9999).time()).
    const name = filename ?? this.generateRandomName();
    const key = `${folder}/${name}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  // Laravel: uploadBase64File($base64File, $folder, $allowedFileTypes, $fileSize = 1024 KB).
  // Returns: storage path (`{folder}/{hash}.{ext}`).
  async uploadBase64File(
    base64File: string,
    folder: string,
    allowedFileTypes: string[] = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx'],
    maxSizeKb = 1024,
  ): Promise<string> {
    // Laravel regex: /^data:(\w+)\/(\w+);base64,/
    const match = /^data:\w+\/(\w+);base64,/.exec(base64File);
    let b64 = base64File;
    let extension = 'jpg';
    if (match) {
      b64 = base64File.substring(base64File.indexOf(',') + 1);
      extension = match[1].toLowerCase();
    }

    if (!allowedFileTypes.includes(extension)) {
      throw new BusinessException(
        422,
        `base64_file_not_valid (allowed: ${allowedFileTypes.join(', ')})`,
      );
    }

    // Size check (KB).
    const sizeKb = this.getBase64FileSizeKb(b64);
    if (sizeKb > maxSizeKb) {
      throw new BusinessException(
        422,
        `maximum_file_size_exceeded (${sizeKb.toFixed(2)}KB > ${maxSizeKb}KB)`,
      );
    }

    // Laravel: str_replace(' ', '+', $base64) — URL-encoded base64'ni qaytarish.
    b64 = b64.replace(/ /g, '+');
    let buffer: Buffer;
    try {
      buffer = Buffer.from(b64, 'base64');
    } catch {
      throw new BusinessException(422, 'base64_file_not_valid');
    }
    if (buffer.length === 0) {
      throw new BusinessException(422, 'base64_file_not_valid');
    }

    const filename = `${this.generateRandomName()}.${extension}`;
    const key = `${folder}/${filename}`;

    const mimeType =
      extension === 'pdf'
        ? 'application/pdf'
        : extension === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : `image/${extension === 'jpg' ? 'jpeg' : extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  // Laravel: getBase64FileSize — KB.
  private getBase64FileSizeKb(base64: string): number {
    const padding = (base64.match(/=/g) ?? []).length;
    const size = (base64.length * 3) / 4 - padding;
    return Math.round((size / 1024) * 100) / 100;
  }

  private generateRandomName(): string {
    // Laravel: md5(Str::random(25).random_int(1,9999).time()).
    const random = randomBytes(25).toString('base64url');
    const rand = Math.floor(Math.random() * 9999) + 1;
    const time = Math.floor(Date.now() / 1000);
    return createHash('md5')
      .update(`${random}${rand}${time}`)
      .digest('hex');
  }
}
