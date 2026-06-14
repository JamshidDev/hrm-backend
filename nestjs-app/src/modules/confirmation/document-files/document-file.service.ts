// DocumentFile service. Laravel: Confirmation/DocumentFileController.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { document_files, worker_applications } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CONFIRMATION_STATUS_LABELS,
  WORKER_APPLICATION_TYPE_LABELS,
} from '@/modules/hr/worker-applications/worker-application.types';
import {
  CreateDocumentFileDto,
  DocumentFileIndexQueryDto,
  QueryDocumentFileDto,
  UpdateDocumentFileDto,
} from '@/modules/confirmation/document-files/dto/document-file.dto';

// Laravel ModelTypeEnum::tryFrom($model)->model() — model string → Eloquent FQCN.
// document_files.model_type ustunida shu FQCN saqlanadi.
const MODEL_FQCN: Record<string, string> = {
  contracts: 'Modules\\HR\\Models\\Contract',
  commands: 'Modules\\HR\\Models\\Command',
  'contract-additional': 'Modules\\HR\\Models\\ContractAdditional',
  'worker-application': 'Modules\\HR\\Models\\WorkerApplication',
  timesheet: 'Modules\\TimeSheet\\Models\\TimeSheet',
  'vacation-schedule': 'Modules\\HR\\Models\\VacationScheduleYear',
  'lms-certificate': 'Modules\\LMS\\Models\\LmsCertificate',
};

const DOCUMENT_FILE_TYPES = [
  'pdf',
  'xlsx',
  'xls',
  'docx',
  'png',
  'jpg',
  'jpeg',
];

@Injectable()
export class DocumentFileService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // GET /api/v1/document/files?model=&document_id=
  // Laravel: index() — model_type (FQCN) + model_id bo'yicha, paginatsiyasiz collection.
  async findAll(query: DocumentFileIndexQueryDto) {
    const fqcn = MODEL_FQCN[query.model];
    if (!fqcn) {
      throw new BusinessException(404, this.i18n.t('error.model_not_found'));
    }

    const rows = await this.db
      .select()
      .from(document_files)
      .where(
        and(
          notDeleted(document_files),
          eq(document_files.model_type, fqcn),
          eq(document_files.model_id, query.document_id),
        ),
      )
      .orderBy(desc(document_files.id));

    // worker_application'larni batch yuklash (Laravel: with('worker_application')).
    const appIds = [
      ...new Set(
        rows
          .map((r) => r.worker_application_id)
          .filter((x): x is number => x != null),
      ),
    ];
    const apps = appIds.length
      ? await this.db
          .select({
            id: worker_applications.id,
            created_at: worker_applications.created_at,
            type: worker_applications.type,
            number: worker_applications.number,
            confirmation_file: worker_applications.confirmation_file,
            confirmation: worker_applications.confirmation,
          })
          .from(worker_applications)
          .where(inArray(worker_applications.id, appIds))
      : [];
    const appMap = new Map<number, (typeof apps)[number]>();
    for (const a of apps) appMap.set(a.id, a);

    // Laravel DocumentFileResource.
    return Promise.all(
      rows.map(async (r) => {
        const app =
          r.worker_application_id != null
            ? appMap.get(r.worker_application_id)
            : undefined;
        return {
          id: r.id,
          file: await this.minio.fileUrl(r.file),
          original_name: r.original_name,
          size: r.size,
          worker_application: app
            ? {
                id: app.id,
                created_at: app.created_at,
                type: {
                  id: app.type,
                  name: this.label(WORKER_APPLICATION_TYPE_LABELS[app.type]),
                },
                number: app.number,
                confirmation_file: await this.minio.fileUrl(
                  app.confirmation_file,
                ),
                confirmation: {
                  id: app.confirmation,
                  name: this.label(
                    CONFIRMATION_STATUS_LABELS[app.confirmation],
                  ),
                },
              }
            : null,
        };
      }),
    );
  }

  // GET /api/v1/document/files/{id}
  async findOne(id: number) {
    const [row] = await this.db
      .select()
      .from(document_files)
      .where(and(eq(document_files.id, id), notDeleted(document_files)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return { ...row, file: await this.minio.fileUrl(row.file) };
  }

  // POST /api/v1/document/files — multipart/form-data.
  // Laravel: store() — status='application' bo'lsa worker_application'lar
  // bog'lanadi, aks holda fayl(lar) MinIO'ga yuklanadi.
  async create(
    dto: CreateDocumentFileDto,
    files?: Express.Multer.File[],
  ): Promise<void> {
    const fqcn = MODEL_FQCN[dto.model];
    if (!fqcn) {
      throw new BusinessException(404, this.i18n.t('error.model_not_found'));
    }

    await this.db.transaction(async (tx) => {
      if (dto.status === 'application') {
        // worker_application'larni hujjatga bog'lash.
        if (!dto.worker_applications) {
          throw new BusinessException(422, this.i18n.t('messages.not_found'));
        }
        const appIds = dto.worker_applications
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n));
        for (const appId of appIds) {
          await tx.insert(document_files).values({
            model_id: dto.document_id,
            model_type: fqcn,
            worker_application_id: appId,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          });
        }
        return;
      }

      // Fayl(lar)ni MinIO'ga yuklash.
      for (const f of files ?? []) {
        const key = await this.minio.uploadFormFile(
          {
            originalname: f.originalname,
            buffer: f.buffer,
            mimetype: f.mimetype,
            size: f.size,
          },
          `document-files/${dto.model}`,
          DOCUMENT_FILE_TYPES,
        );
        await tx.insert(document_files).values({
          model_id: dto.document_id,
          model_type: fqcn,
          file: key,
          original_name: f.originalname,
          size: f.size,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }
    });
  }

  // PUT /api/v1/document/files/{id}
  async update(id: number, dto: UpdateDocumentFileDto): Promise<void> {
    const [row] = await this.db
      .select({ id: document_files.id })
      .from(document_files)
      .where(and(eq(document_files.id, id), notDeleted(document_files)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    const setData: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.file) {
      if (dto.file.startsWith('data:')) {
        setData.file = await this.minio.uploadBase64File(
          dto.file,
          'document-files',
          ['jpg', 'jpeg', 'png', 'pdf', 'docx'],
          10240,
        );
      } else {
        setData.file = dto.file;
      }
    }
    if (dto.original_name !== undefined)
      setData.original_name = dto.original_name;

    await this.db
      .update(document_files)
      .set(setData)
      .where(eq(document_files.id, id));
  }

  // DELETE /api/v1/document/files/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: document_files.id })
      .from(document_files)
      .where(and(eq(document_files.id, id), notDeleted(document_files)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(document_files)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(document_files.id, id));
  }

  // NOTE: GET /api/v1/document/applications endi WorkerApplicationService::findAll
  // ga delegatsiya qilinadi (DocumentApplicationsController) — Laravel
  // DocumentFileController::applications worker_applications jadvalini so'raydi,
  // document_files emas. Eski (noto'g'ri) applications() metodi olib tashlandi.

  // i18n kalitini matnga aylantirish (topilmasa bo'sh satr).
  private label(key: string | undefined): string {
    if (!key) return '';
    const val = this.i18n.t(key);
    return typeof val === 'string' ? val : '';
  }
}
