// Economist uploads service. Laravel:
//   - EconomistUploadController (upload, confirmed)
//   - EconomistController (uploadHistories, updateUploadStatus, refreshWorkersPins)
//
// .xlsx fayl yuklanadi → MinIO'ga saqlanadi → batch'larda statements/tax/pension
// jadvallariga insert qilinadi → *_aggregates yangilanadi.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { economist_uploads, organization_economist_uploads } from '@/db/schema';
import { ExcelService } from '@/shared/excel/excel.service';
import { MinioService } from '@/shared/minio/minio.service';
import type { Express } from 'express';
import {
  UploadStatus,
  UploadType,
  uploadTypesList,
  resolveRefreshTable,
} from '@/modules/economist/_shared/upload-enums';
import { getUploadDeadline } from '@/modules/economist/_shared/code-groups';
import type { PageQueryLike } from '@/modules/economist/_shared/helpers';
import { parseStatement } from '@/modules/economist/uploads/parsers/statement.parser';
import { parseTaxFour } from '@/modules/economist/uploads/parsers/tax-four.parser';
import { parseTaxFive } from '@/modules/economist/uploads/parsers/tax-five.parser';
import { parsePension } from '@/modules/economist/uploads/parsers/pension.parser';

interface UploadDto {
  organization_id: number;
  type: number; // UploadType: 1..4
  year: number;
  month: number;
  user_id: number;
}

interface ConfirmDto {
  organization_id: number;
  type: number;
  year: number;
  month: number;
}

@Injectable()
export class UploadService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly excel: ExcelService,
    private readonly minio: MinioService,
  ) {}

  // ============================================================
  // POST /api/v1/economist/upload — multipart Excel yuklash
  // ============================================================

  /**
   * Excel fayl yuklash + parse + DB'ga yozish (sinxron rejimda — keyinchalik
   * BullMQ queue'ga ko'chirilishi mumkin).
   */
  async upload(
    body: UploadDto,
    file: Express.Multer.File,
  ): Promise<{ upload_id: number; inserted: number; errors: string[] }> {
    const { organization_id, type, year, month, user_id } = body;
    if (!organization_id || !type || !year || !month) {
      throw new BusinessException(422, 'validation_failed');
    }

    // 1. Tasdiqlangan upload bo'lsa, yangi yuklashga ruxsat berilmaydi
    const [{ approvedCount }] = await this.db
      .select({ approvedCount: count() })
      .from(economist_uploads)
      .where(
        and(
          eq(economist_uploads.organization_id, organization_id),
          eq(economist_uploads.type, type),
          eq(economist_uploads.year, year),
          eq(economist_uploads.month, month),
          eq(economist_uploads.status, UploadStatus.SUCCESS),
        ),
      );
    if (Number(approvedCount) > 0) {
      throw new BusinessException(422, 'the_file_has_already_been_approved');
    }

    // 2. Deadline tekshiruvi (uploadStatus override bo'lmasa)
    const [override] = await this.db
      .select({ id: organization_economist_uploads.id })
      .from(organization_economist_uploads)
      .where(
        and(
          eq(organization_economist_uploads.organization_id, organization_id),
          eq(organization_economist_uploads.year, year),
          eq(organization_economist_uploads.month, month),
        ),
      )
      .limit(1);
    if (!override) {
      const deadline = getUploadDeadline(year, month);
      if (new Date() > deadline) {
        throw new BusinessException(422, 'permission_denied_upload');
      }
    }

    // 3. Avvalgi uploadlarni RELOADED status bilan belgilash
    await this.db
      .update(economist_uploads)
      .set({ status: UploadStatus.RELOADED, updated_at: sql`NOW()` })
      .where(
        and(
          eq(economist_uploads.organization_id, organization_id),
          eq(economist_uploads.type, type),
          eq(economist_uploads.year, year),
          eq(economist_uploads.month, month),
        ),
      );

    // 4. Faylni MinIO'ga yuklash (`economist-uploads/` prefix bilan, xlsx/csv only)
    const minioKey = await this.minio.uploadFormFile(
      file,
      'economist-uploads',
      ['xlsx', 'csv'],
    );

    // 5. EconomistUpload yozuvi yaratish (done=2 = processing)
    const [created] = await this.db
      .insert(economist_uploads)
      .values({
        organization_id,
        user_id,
        type,
        file: minioKey,
        year,
        month,
        done: 2,
        status: UploadStatus.PROCESS,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      } as never)
      .returning({ id: economist_uploads.id });
    const uploadId = created.id;

    // 6. Avvalgi yozuvlarni o'chirish + parser ishga tushirish
    try {
      const result = await this.dispatchParser(
        type,
        organization_id,
        year,
        month,
        uploadId,
        file.buffer,
      );

      // 7. done=3 (success); comment'da xatolar
      await this.db
        .update(economist_uploads)
        .set({
          done: 3,
          comment: result.errors.length ? result.errors.join('\n') : null,
          updated_at: sql`NOW()`,
        })
        .where(eq(economist_uploads.id, uploadId));

      return {
        upload_id: uploadId,
        inserted: result.inserted,
        errors: result.errors,
      };
    } catch (err) {
      await this.db
        .update(economist_uploads)
        .set({
          done: 1,
          status: UploadStatus.ERROR,
          comment: (err as Error)?.message ?? 'Unknown error',
          updated_at: sql`NOW()`,
        })
        .where(eq(economist_uploads.id, uploadId));
      throw err;
    }
  }

  /** Type bo'yicha parser tanlash va eski qatorlarni o'chirish. */
  private async dispatchParser(
    type: number,
    organizationId: number,
    year: number,
    month: number,
    uploadId: number,
    fileBuffer: Buffer,
  ) {
    // Avval shu (org, year, month) uchun eski qatorlarni forceDelete
    const tableMap: Record<number, string> = {
      [UploadType.STATEMENTS]: 'statements',
      [UploadType.TAX_FOUR]: 'tax_four_applications',
      [UploadType.TAX_FIVE]: 'tax_five_applications',
      [UploadType.PENSION_PAYMENTS]: 'pension_payments',
    };
    const tableName = tableMap[type];
    if (!tableName) {
      throw new BusinessException(422, 'unknown_upload_type');
    }

    await this.db.execute(
      sql`DELETE FROM ${sql.raw(tableName)}
          WHERE organization_id = ${organizationId}
            AND year = ${year}
            AND month = ${month}`,
    );

    // Parser tanlash
    const ctx = {
      db: this.db,
      fileBuffer,
      organizationId,
      year,
      month,
      uploadId,
    };

    switch (type) {
      case UploadType.STATEMENTS:
        return parseStatement(ctx, this.excel);
      case UploadType.TAX_FOUR:
        return parseTaxFour(ctx, this.excel);
      case UploadType.TAX_FIVE:
        return parseTaxFive(ctx, this.excel);
      case UploadType.PENSION_PAYMENTS:
        return parsePension(ctx, this.excel);
      default:
        throw new BusinessException(422, 'unknown_upload_type');
    }
  }

  // ============================================================
  // POST /api/v1/economist/upload-histories/confirm — Tasdiqlash
  // ============================================================

  async confirmed(body: ConfirmDto) {
    const [latest] = await this.db
      .select()
      .from(economist_uploads)
      .where(
        and(
          eq(economist_uploads.organization_id, body.organization_id),
          eq(economist_uploads.type, body.type),
          eq(economist_uploads.year, body.year),
          eq(economist_uploads.month, body.month),
        ),
      )
      .orderBy(desc(economist_uploads.id))
      .limit(1);

    if (!latest) throw new BusinessException(404, 'not_found');

    await this.db
      .update(economist_uploads)
      .set({ status: UploadStatus.SUCCESS, updated_at: sql`NOW()` })
      .where(eq(economist_uploads.id, latest.id));

    return { confirmed: true, upload_id: latest.id };
  }

  // ============================================================
  // GET /api/v1/economist/upload-histories — Tarix (type bo'yicha guruhlangan)
  // ============================================================

  async histories(
    q: PageQueryLike & {
      organization_id?: string | number;
    },
  ) {
    const conds: ReturnType<typeof eq>[] = [];
    if (q.organization_id !== undefined) {
      conds.push(
        eq(economist_uploads.organization_id, Number(q.organization_id)),
      );
    }
    if (q.year !== undefined) {
      conds.push(eq(economist_uploads.year, Number(q.year)));
    }
    if (q.month !== undefined) {
      conds.push(eq(economist_uploads.month, Number(q.month)));
    }

    const rows = await this.db
      .select()
      .from(economist_uploads)
      .where(conds.length ? and(...conds) : sql`TRUE`)
      .orderBy(desc(economist_uploads.id));

    // Type bo'yicha guruhlash: har UploadType uchun bitta tugun
    const grouped = new Map<number, typeof rows>();
    for (const r of rows) {
      if (!grouped.has(r.type)) grouped.set(r.type, []);
      grouped.get(r.type)!.push(r);
    }

    const labels = uploadTypesList();
    return labels.map((label) => {
      const list = grouped.get(label.id) ?? [];
      return {
        id: label.id,
        name: label.name,
        // status: at least 1 success
        status: list.some((u) => u.status === UploadStatus.SUCCESS),
        count: list.length,
        data: list,
      };
    });
  }

  // ============================================================
  // POST /api/v1/economist/upload-statuses — Status toggle (admin override)
  // ============================================================

  async updateStatus(body: {
    organization_id: number;
    year: number;
    month: number;
    status: boolean;
  }) {
    const { organization_id, year, month, status } = body;
    if (!organization_id || !year || !month) {
      throw new BusinessException(422, 'validation_failed');
    }

    if (status) {
      // upsert: agar bor bo'lsa, yangilash, aks holda yaratish
      const [existing] = await this.db
        .select({ id: organization_economist_uploads.id })
        .from(organization_economist_uploads)
        .where(
          and(
            eq(organization_economist_uploads.organization_id, organization_id),
            eq(organization_economist_uploads.year, year),
            eq(organization_economist_uploads.month, month),
          ),
        )
        .limit(1);
      if (!existing) {
        await this.db.insert(organization_economist_uploads).values({
          organization_id,
          year,
          month,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }
    } else {
      // Hard delete (Laravel forceDelete)
      await this.db
        .delete(organization_economist_uploads)
        .where(
          and(
            eq(organization_economist_uploads.organization_id, organization_id),
            eq(organization_economist_uploads.year, year),
            eq(organization_economist_uploads.month, month),
          ),
        );
    }

    return { updated: true };
  }

  // ============================================================
  // GET /api/v1/economist/refresh-worker-pins — PIN'larni qayta moslash
  // ============================================================

  /**
   * Laravel raw SQL parity:
   *   UPDATE <table> s
   *   SET worker_id = (SELECT w.id FROM workers w WHERE w.pin = s.pin LIMIT 1)
   *   WHERE s.year=? AND s.month=? AND s.worker_id IS NULL
   */
  async refreshWorkerPins(q: {
    type: string;
    year: number | string;
    month: number | string;
  }) {
    const table = resolveRefreshTable(q.type);
    const year = Number(q.year);
    const month = Number(q.month);

    if (!year || !month) {
      throw new BusinessException(422, 'validation_failed');
    }

    const result = await this.db.execute(
      sql`UPDATE ${sql.raw(table)} s
          SET worker_id = (
            SELECT w.id FROM workers w WHERE w.pin = s.pin LIMIT 1
          )
          WHERE s.year = ${year}
            AND s.month = ${month}
            AND s.worker_id IS NULL`,
    );

    return { updated: true, affected: result.length ?? 0 };
  }
}
