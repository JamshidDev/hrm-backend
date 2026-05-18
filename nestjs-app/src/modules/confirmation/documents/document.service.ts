// Document service. Laravel: Confirmation/DocumentController + DocumentConfirmationController.
//
// QAYDLAR:
//   - Real Laravel signature flow E-IMZO/Onlineflow + only_office integration.
//   - Bu yerda asosiy stub'lar: document base64 return, signature record,
//     forward, generate-url, history, files.

import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  command_confirmations,
  contract_additional,
  contract_additional_confirmations,
  contracts,
  contract_confirmations,
  document_files,
  document_histories,
  commands,
  time_sheets,
  timesheet_confirmations,
  vacation_schedule_years,
  vacation_schedule_confirmations,
  worker_application_confirmations,
  worker_applications,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  DocumentBase64QueryDto,
  DocumentConfirmDto,
  DocumentQueryDto,
  DocumentSignatureDto,
  DocumentUpdateDto,
  ForwardConfirmationDto,
  GenerateConfirmationUrlDto,
} from '@/modules/confirmation/documents/dto/document.dto';

const MODEL_TYPE_TABLE_MAP: Record<
  string,
  { doc: unknown; conf: unknown; fk: string }
> = {
  contracts: {
    doc: contracts,
    conf: contract_confirmations,
    fk: 'contract_id',
  },
  commands: { doc: commands, conf: command_confirmations, fk: 'command_id' },
  'contract-additional': {
    doc: contract_additional,
    conf: contract_additional_confirmations,
    fk: 'contract_additional_id',
  },
  timesheet: {
    doc: time_sheets,
    conf: timesheet_confirmations,
    fk: 'time_sheet_id',
  },
  'vacation-schedule': {
    doc: vacation_schedule_years,
    conf: vacation_schedule_confirmations,
    fk: 'vacation_schedule_year_id',
  },
  'worker-application': {
    doc: worker_applications,
    conf: worker_application_confirmations,
    fk: 'worker_application_id',
  },
};

@Injectable()
export class DocumentService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly config: ConfigService,
  ) {}

  // GET /api/v1/confirmation/document/base64
  async documentBase64(query: DocumentBase64QueryDto) {
    const map = MODEL_TYPE_TABLE_MAP[query.model_type];
    if (!map) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.invalid_type'),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dTable = map.doc as any;
    const [doc] = await this.db
      .select({ file: dTable.file })
      .from(dTable)
      .where(and(eq(dTable.id, query.model_id), notDeleted(dTable)))
      .limit(1);
    if (!doc) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // Laravel: return file contents as base64. Here we return URL.
    return {
      model_type: query.model_type,
      model_id: query.model_id,
      file: await this.minio.fileUrl(doc.file),
    };
  }

  // POST /api/v1/confirmation/document/signature — record signature confirmation.
  async signature(dto: DocumentSignatureDto): Promise<void> {
    const map = MODEL_TYPE_TABLE_MAP[dto.model_type];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    const userId = this.ctx.user_or_fail.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dTable = map.doc as any;
    const [doc] = await this.db
      .select({ id: dTable.id })
      .from(dTable)
      .where(and(eq(dTable.id, dto.model_id), notDeleted(dTable)))
      .limit(1);
    if (!doc) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    // History entry.
    await this.db.insert(document_histories).values({
      model_id: dto.model_id,
      model_type: dto.model_type,
      user_id: userId,
      status: 3, // SUCCESS
      description: dto.signature ?? null,
    });
  }

  // POST /api/v1/confirmation/forward
  async forwardConfirmation(dto: ForwardConfirmationDto): Promise<void> {
    const map = MODEL_TYPE_TABLE_MAP[dto.model_type];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cTable = map.conf as any;
    const [conf] = await this.db
      .select({ id: cTable.id })
      .from(cTable)
      .where(eq(cTable.id, dto.confirmation_id))
      .limit(1);
    if (!conf) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(cTable)
      .set({ status: 2, updated_at: sql`NOW()` }) // READ
      .where(eq(cTable.id, dto.confirmation_id));
  }

  // GET /api/v1/confirmation/document/show
  async showDocument(query: DocumentQueryDto) {
    const map = MODEL_TYPE_TABLE_MAP[query.model_type];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dTable = map.doc as any;
    const [doc] = await this.db
      .select()
      .from(dTable)
      .where(and(eq(dTable.id, query.model_id), notDeleted(dTable)))
      .limit(1);
    if (!doc) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return doc;
  }

  // GET /api/v1/confirmation/document/history
  async documentHistory(query: DocumentQueryDto) {
    return this.db
      .select()
      .from(document_histories)
      .where(
        and(
          eq(document_histories.model_id, query.model_id),
          eq(document_histories.model_type, query.model_type),
          notDeleted(document_histories),
        ),
      )
      .orderBy(desc(document_histories.id));
  }

  // GET /api/v1/document/generate-url
  // Laravel: signedRoute with HMAC.
  async generateConfirmationUrl(query: GenerateConfirmationUrlDto) {
    const userId = this.ctx.user_or_fail.id;
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
    const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:8001');
    const appKey = this.config.get<string>('APP_KEY', 'dev-secret');

    const params = new URLSearchParams({
      model_type: query.model_type,
      model_id: String(query.model_id),
      user_id: String(userId),
      expires: String(expires),
    });
    const signature = createHmac('sha256', appKey)
      .update(params.toString())
      .digest('hex');
    params.set('signature', signature);

    return { url: `${baseUrl}/api/v1/document/signature?${params.toString()}` };
  }

  // POST /api/v1/document/document-confirm
  async confirmDocument(dto: DocumentConfirmDto): Promise<void> {
    const map = MODEL_TYPE_TABLE_MAP[dto.model_type];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    const userId = this.ctx.user_or_fail.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dTable = map.doc as any;
    const [doc] = await this.db
      .select({ id: dTable.id })
      .from(dTable)
      .where(and(eq(dTable.id, dto.model_id), notDeleted(dTable)))
      .limit(1);
    if (!doc) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    await this.db
      .update(dTable)
      .set({ confirmation: dto.status, updated_at: sql`NOW()` })
      .where(eq(dTable.id, dto.model_id));

    await this.db.insert(document_histories).values({
      model_id: dto.model_id,
      model_type: dto.model_type,
      user_id: userId,
      status: dto.status,
      description: dto.comment ?? null,
    });
  }

  // POST /api/v1/document/update (only_office_ip)
  async updateDocument(_dto: DocumentUpdateDto): Promise<{ error: number }> {
    // OnlyOffice callback — stub. Returns success.
    return { error: 0 };
  }

  // POST /api/v1/document/view/{model}/{uuid}
  async viewDocument(model: string, uuid: string) {
    // Generate temporary view URL — stub.
    return {
      model,
      uuid,
      view_url: 'https://only-office-placeholder',
    };
  }
}
