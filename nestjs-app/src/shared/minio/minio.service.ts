// MinIO signed URL generator + file upload. Laravel: Helper::fileUrl() + Base64FileUploadTrait::uploadFormFile.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
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
  // Laravel config('filesystems.disks.minio.url') — env('MINIO_URL'). O'rnatilmagan
  // bo'lsa Laravel null qaytaradi va `url . '/' . $path` → `/path` (boshida '/').
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'hrm-media');
    this.publicUrl = this.config.get<string>('MINIO_URL', '');
    this.client = new S3Client({
      endpoint: this.config.get<string>('MINIO_ENDPOINT'),
      region: this.config.get<string>('MINIO_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY', ''),
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY', ''),
      },
      // MinIO path-style endpoint: https://endpoint/bucket/key
      forcePathStyle: true,
      // AWS SDK v3 default'da har GetObject/PutObject'ga `x-amz-checksum-*`
      // qo'shadi — MinIO buni qo'llab-quvvatlamaydi, signed URL ishlamay qoladi.
      // WHEN_REQUIRED — checksum'ni faqat zarur bo'lganda qo'shadi (Laravel parity).
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
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

  // Laravel: config('...minio.url') . '/' . $path. Public/upload-target URL
  // (signed emas) — frontend chunk'larni shu prefix ostiga yuklaydi.
  objectUrl(path: string): string {
    return `${this.publicUrl}/${path}`;
  }

  // Laravel: Storage::disk('minio')->files($dir) — $dir ichidagi fayllar (rekursiv
  // EMAS, faqat to'g'ridan-to'g'ri bolalar). delimiter '/' bilan CommonPrefixes
  // (kichik papkalar) chetlab o'tiladi.
  async listFiles(dir: string): Promise<string[]> {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`;
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          Delimiter: '/',
          ContinuationToken: token,
        }),
      );
      for (const obj of res.Contents ?? []) {
        // Prefix'ning o'zi (papka belgisi) fayl emas — chetlab o'tamiz.
        if (obj.Key && obj.Key !== prefix) keys.push(obj.Key);
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }

  // Faylni MinIO'dan xom Buffer sifatida yuklab olish (stream → buffer).
  async getObject(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = res.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk as unknown as Uint8Array),
      );
    }
    return Buffer.concat(chunks);
  }

  // Xom Buffer'ni MinIO'ga berilgan key bo'yicha saqlash.
  async putObject(
    key: string,
    body: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
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
    return createHash('md5').update(`${random}${rand}${time}`).digest('hex');
  }
}
