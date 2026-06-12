// WorkerApplication service. Laravel: HR/WorkerApplicationController (3 routes in HR).
// Endpoints: index, accept, generate-url.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organizations, worker_applications, workers } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  CONFIRMATION_STATUS_LABELS,
  WORKER_APPLICATION_TYPE_LABELS,
} from '@/modules/hr/worker-applications/worker-application.types';
import {
  AcceptWorkerApplicationDto,
  GenerateApplicationUrlDto,
  QueryWorkerApplicationDto,
} from '@/modules/hr/worker-applications/dto/worker-application.dto';

@Injectable()
export class WorkerApplicationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly config: ConfigService,
    private readonly scope: OrgScopeService,
  ) {}

  // GET /api/v1/hr/applications
  async findAll(filters: QueryWorkerApplicationDto) {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Laravel scopeSearchByFullName parity.
    const searchCond = buildWorkerSearchCond(filters.search);
    // Laravel WorkerApplication::filter — role + organizations + organization_id.
    const inScope = await this.scope.whereOrg(
      worker_applications.organization_id,
      {
        organizations: filters.organizations,
        organization_id: filters.organization_id,
      },
    );

    const where = and(
      notDeleted(worker_applications),
      isNotNull(worker_applications.worker_id),
      inScope,
      searchCond,
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_applications.id,
          created_at: worker_applications.created_at,
          number: worker_applications.number,
          file: worker_applications.file,
          confirmation_file: worker_applications.confirmation_file,
          status: worker_applications.status,
          generate: worker_applications.generate,
          confirmation: worker_applications.confirmation,
          type: worker_applications.type,
          user_id: worker_applications.user_id,
          worker_id: workers.id,
          worker_uuid: workers.uuid,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
        })
        .from(worker_applications)
        .leftJoin(workers, eq(workers.id, worker_applications.worker_id))
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_applications.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .where(where)
        .orderBy(desc(worker_applications.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_applications)
        .leftJoin(workers, eq(workers.id, worker_applications.worker_id))
        .where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          created_at: r.created_at,
          type: {
            id: r.type,
            name: this.tr(WORKER_APPLICATION_TYPE_LABELS[r.type], lang),
          },
          worker: r.worker_id
            ? {
                id: r.worker_id,
                photo: await this.minio.fileUrl(r.worker_photo),
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
              }
            : null,
          number: r.number,
          file: await this.minio.fileUrl(r.file),
          confirmation_file: await this.minio.fileUrl(r.confirmation_file),
          organization: r.org_id
            ? {
                id: r.org_id,
                name:
                  lang === 'ru'
                    ? (r.org_name_ru ?? r.org_name)
                    : lang === 'en'
                      ? (r.org_name_en ?? r.org_name)
                      : r.org_name,
                group: r.org_group ?? false,
              }
            : null,
          status: r.status,
          generate: r.generate,
          confirmation: {
            id: r.confirmation,
            name: this.tr(CONFIRMATION_STATUS_LABELS[r.confirmation], lang),
          },
          creator: r.user_id,
        })),
      ),
    };
  }

  // PUT /api/v1/hr/applications/{id}/accept
  async accept(id: number, dto: AcceptWorkerApplicationDto): Promise<void> {
    const [row] = await this.db
      .select({ id: worker_applications.id })
      .from(worker_applications)
      .where(
        and(eq(worker_applications.id, id), notDeleted(worker_applications)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // status=true → confirmation=SUCCESS (3); else REJECTED (4).
    await this.db
      .update(worker_applications)
      .set({
        confirmation: dto.status ? 3 : 4,
        updated_at: sql`NOW()`,
      })
      .where(eq(worker_applications.id, id));
    void dto.comment; // not stored — Laravel'da ham faqat log uchun ishlatilishi mumkin.
  }

  // POST /api/v1/hr/applications/generate-url
  // Laravel: signedRoute({worker_position_id, type, user_id, expires}) + APP_KEY HMAC.
  // NestJS'da equivalent: APP_KEY orqali HMAC-SHA256 signed URL.
  async generateUrl(dto: GenerateApplicationUrlDto): Promise<{ url: string }> {
    const userId = this.ctx.user_or_fail.id;
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 1 hafta
    const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:8001');
    const appKey = this.config.get<string>('APP_KEY', 'dev-secret');

    const params = new URLSearchParams({
      worker_position_id: String(dto.worker_position_id),
      type: String(dto.type),
      user_id: String(userId),
      expires: String(expires),
    });
    const signaturePayload = params.toString();
    const signature = createHmac('sha256', appKey)
      .update(signaturePayload)
      .digest('hex');
    params.set('signature', signature);

    return {
      url: `${baseUrl}/api/v1/worker-application/sign?${params.toString()}`,
    };
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }
}
