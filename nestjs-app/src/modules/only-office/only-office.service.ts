// OnlyOffice service. Laravel: routes/api.php `only-office/file/:uuid` (signed middleware).
// ModelTypeEnum orqali polymorphic lookup → MinIO file download (stream).

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { eq, type AnyColumn, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MinioService } from '@/shared/minio/minio.service';
import {
  commands,
  contract_additional,
  contracts,
  lms_certificates,
  sended_workers,
  vacation_schedule_years,
  worker_applications,
} from '@/db/schema';

// Laravel ModelTypeEnum mapping → Drizzle tables. Har bir jadval `uuid` va `file`
// ustunlariga ega bo'lishi shart.
interface FileTable {
  table: PgTable;
  uuidCol: AnyColumn;
  fileCol: AnyColumn;
}

const TABLE_MAP: Record<string, FileTable> = {
  contracts: {
    table: contracts,
    uuidCol: contracts.uuid,
    fileCol: contracts.file,
  },
  commands: {
    table: commands,
    uuidCol: commands.uuid,
    fileCol: commands.file,
  },
  'contract-additional': {
    table: contract_additional,
    uuidCol: contract_additional.uuid,
    fileCol: contract_additional.file,
  },
  'worker-application': {
    table: worker_applications,
    uuidCol: worker_applications.uuid,
    fileCol: worker_applications.file,
  },
  'lms-certificate': {
    table: lms_certificates,
    uuidCol: lms_certificates.uuid,
    fileCol: lms_certificates.file,
  },
  med: {
    table: sended_workers,
    uuidCol: sended_workers.uuid,
    fileCol: sended_workers.file,
  },
  'vacation-schedule': {
    table: vacation_schedule_years,
    uuidCol: vacation_schedule_years.uuid,
    fileCol: vacation_schedule_years.file,
  },
};

export interface OnlyOfficeFile {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

@Injectable()
export class OnlyOfficeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/only-office/file/:uuid?model=&expires=&signature=
   * Laravel: `signed` middleware + ModelTypeEnum → MinIO download.
   *
   * 1. HMAC signature tekshiriladi (buildOnlyOfficeUrl bilan bir xil algoritm)
   * 2. uuid+model bo'yicha hujjat topiladi
   * 3. DOCX MinIO'dan xom buffer sifatida qaytariladi
   */
  async getFile(
    uuid: string,
    query: { model?: string; expires?: string; signature?: string },
  ): Promise<OnlyOfficeFile> {
    const { model, expires, signature } = query;
    if (!model || !TABLE_MAP[model]) {
      throw new BusinessException(403, 'forbidden');
    }

    // 1) Signed URL tekshiruvi (Laravel `signed` middleware ekvivalenti).
    this.verifySignature(uuid, model, expires, signature);

    // 2) Hujjatni topish.
    const cfg = TABLE_MAP[model];
    const whereExpr: SQL = eq(cfg.uuidCol, uuid);
    const rows = (await this.db
      .select()
      .from(cfg.table)
      .where(whereExpr)
      .limit(1)) as Array<Record<string, unknown>>;
    if (!rows.length) throw new BusinessException(404, 'not_found');

    const filePath = (rows[0].file as string | null) ?? null;
    if (!filePath) throw new BusinessException(404, 'not_found');

    // 3) MinIO'dan yuklab olish.
    const buffer = await this.minio.getObject(filePath);
    const fileName = filePath.split('/').pop() ?? `${uuid}.docx`;
    return {
      buffer,
      fileName,
      contentType: this.contentTypeFor(fileName),
    };
  }

  // buildOnlyOfficeUrl bilan bir xil HMAC: sha256(appKey, "only-office/file/{uuid}?expires=&model=").
  private verifySignature(
    uuid: string,
    model: string,
    expires: string | undefined,
    signature: string | undefined,
  ): void {
    if (!expires || !signature) {
      throw new BusinessException(403, 'invalid_signature');
    }
    const expiresNum = Number(expires);
    if (!Number.isFinite(expiresNum) || expiresNum < Date.now() / 1000) {
      throw new BusinessException(403, 'url_expired');
    }
    const appKey = this.config.get<string>('APP_KEY', 'dev-secret');
    // Eslatma: params tartibi buildOnlyOfficeUrl bilan bir xil — expires, model.
    const params = new URLSearchParams({ expires, model });
    const expected = createHmac('sha256', appKey)
      .update(`only-office/file/${uuid}?${params.toString()}`)
      .digest('hex');
    if (expected !== signature) {
      throw new BusinessException(403, 'invalid_signature');
    }
  }

  private contentTypeFor(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      doc: 'application/msword',
    };
    return map[ext] ?? 'application/octet-stream';
  }
}
