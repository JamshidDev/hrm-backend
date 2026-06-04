// Document service. Laravel: Confirmation/DocumentController + DocumentConfirmationController.
//
// QAYDLAR:
//   - Real Laravel signature flow E-IMZO/Onlineflow + only_office integration.
//   - Bu yerda asosiy stub'lar: document base64 return, signature record,
//     forward, generate-url, history, files.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { createHmac, createHash, randomBytes } from 'crypto';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  command_confirmations,
  contract_additional,
  contract_additional_confirmations,
  contracts,
  contract_confirmations,
  document_chats,
  document_files,
  document_histories,
  signature_urls,
  commands,
  sended_workers,
  sended_worker_confirmations,
  time_sheets,
  timesheet_confirmations,
  vacation_schedule_years,
  vacation_schedule_confirmations,
  worker_application_confirmations,
  worker_applications,
  staffing_approves,
  staffing_approve_confirmations,
  users as usersTable,
  workers,
} from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ConvertService } from '@/shared/convert/convert.service';
import {
  DocumentBase64QueryDto,
  DocumentConfirmDto,
  DocumentQueryDto,
  DocumentSignatureDto,
  DocumentSignTokenDto,
  DocumentUpdateDto,
  DocumentUpdateQueryDto,
  ForwardConfirmationDto,
  GenerateConfirmationUrlDto,
} from '@/modules/confirmation/documents/dto/document.dto';

const MODEL_TYPE_TABLE_MAP: Record<
  string,
  { doc: unknown; conf: unknown; fk: string; label: string; fqcn: string }
> = {
  contracts: {
    doc: contracts,
    conf: contract_confirmations,
    fk: 'contract_id',
    label: 'Contracts',
    fqcn: 'Modules\\HR\\Models\\Contract',
  },
  commands: {
    doc: commands,
    conf: command_confirmations,
    fk: 'command_id',
    label: 'Commands',
    fqcn: 'Modules\\HR\\Models\\Command',
  },
  'contract-additional': {
    doc: contract_additional,
    conf: contract_additional_confirmations,
    fk: 'contract_additional_id',
    label: 'Contract Additional',
    fqcn: 'Modules\\HR\\Models\\ContractAdditional',
  },
  timesheet: {
    doc: time_sheets,
    conf: timesheet_confirmations,
    fk: 'time_sheet_id',
    label: 'Timesheet',
    fqcn: 'Modules\\TimeSheet\\Models\\TimeSheet',
  },
  'vacation-schedule': {
    doc: vacation_schedule_years,
    conf: vacation_schedule_confirmations,
    fk: 'vacation_schedule_year_id',
    label: 'Vacation schedule',
    fqcn: 'Modules\\HR\\Models\\VacationScheduleYear',
  },
  'worker-application': {
    doc: worker_applications,
    conf: worker_application_confirmations,
    fk: 'worker_application_id',
    label: 'Worker Application',
    fqcn: 'Modules\\HR\\Models\\WorkerApplication',
  },
  med: {
    doc: sended_workers,
    conf: sended_worker_confirmations,
    fk: 'sended_worker_id',
    label: 'Med',
    fqcn: 'Modules\\Med\\Models\\SendedWorker',
  },
  'staffing-approve': {
    doc: staffing_approves,
    conf: staffing_approve_confirmations,
    fk: 'staffing_approve_id',
    label: 'Staffing Approve',
    fqcn: 'Modules\\Economist\\Models\\StaffingApprove',
  },
};

// ConfirmationStatusEnum 1..5 → messages.confirmation.status.* keys.
const CONFIRMATION_STATUS_KEYS: Record<number, string> = {
  1: 'messages.confirmation.status.process',
  2: 'messages.confirmation.status.read',
  3: 'messages.confirmation.status.success',
  4: 'messages.confirmation.status.rejected',
  5: 'messages.confirmation.status.deleted',
};

@Injectable()
export class DocumentService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly config: ConfigService,
    private readonly convert: ConvertService,
  ) {}

  // GET /api/v1/confirmation/document/base64
  async documentBase64(query: DocumentBase64QueryDto) {
    const map = MODEL_TYPE_TABLE_MAP[query.model_type];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
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

  // GET /api/v1/document/show — Laravel DocumentQueryService::show().
  async showDocument(query: DocumentQueryDto) {
    const map = MODEL_TYPE_TABLE_MAP[query.model];
    if (!map) {
      throw new BusinessException(400, this.i18n.t('messages.invalid_type'));
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const dTable = map.doc as any;
    const confTable = map.conf as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const [doc] = await this.db
      .select()
      .from(dTable)
      .where(and(eq(dTable.id, query.document_id), notDeleted(dTable)))
      .limit(1);
    if (!doc || !doc.file) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.document.not_found'),
      );
    }

    const lang = this.ctx.lang;
    const currentUser = this.ctx.user_or_fail;

    // Confirmations + worker. Laravel: confirmations.worker, sortBy(order)→sortBy(type).
    const confRows = await this.db
      .select({
        id: confTable.id,
        status: confTable.status,
        type: confTable.type,
        order: confTable.order,
        position: confTable.position,
        worker_id: workers.id,
        worker_uuid: workers.uuid,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_birthday: workers.birthday,
        worker_pin: workers.pin,
      })
      .from(confTable)
      .leftJoin(workers, eq(workers.id, confTable.worker_id))
      .where(and(eq(confTable[map.fk], doc.id), notDeleted(confTable)));

    // Laravel sort: $document->confirmations->sortBy('order')->sortBy(type-index).
    // Type-index = array_search(type, ['s','w','d']) — topilmasa `false` (=0, 's' bilan teng),
    // shuning uchun noma'lum tip (masalan staffing 'c'=confirmatory) -1 emas, 0 sifatida sort'lanadi.
    const typeIdx = (t: string | null) => {
      const i = ['s', 'w', 'd'].indexOf(t ?? '');
      return i === -1 ? 0 : i;
    };
    confRows.sort(
      (a, b) =>
        typeIdx(a.type) - typeIdx(b.type) || (a.order ?? 0) - (b.order ?? 0),
    );

    // currentUserConfirmation — PROCESS bo'lsa READ ga o'tkaziladi.
    const myConf = confRows.find((c) => c.worker_id === currentUser.worker_id);
    if (myConf && myConf.status === 1) {
      await this.db
        .update(confTable)
        .set({ status: 2, updated_at: sql`NOW()` })
        .where(eq(confTable.id, myConf.id));
      myConf.status = 2;
    }

    // Created user + worker.
    const createdUser = doc.user_id
      ? await this.loadUserInfo(doc.user_id)
      : null;
    const currentUserInfo = await this.loadUserInfo(currentUser.id);

    // Morph counts — histories / chats / files.
    const [[hCnt], [cCnt], [fCnt]] = await Promise.all([
      this.db
        .select({ c: count() })
        .from(document_histories)
        .where(
          and(
            eq(document_histories.model_id, doc.id),
            eq(document_histories.model_type, map.fqcn),
          ),
        ),
      this.db
        .select({ c: count() })
        .from(document_chats)
        .where(
          and(
            eq(document_chats.model_id, doc.id),
            eq(document_chats.model_type, map.fqcn),
          ),
        ),
      this.db
        .select({ c: count() })
        .from(document_files)
        .where(
          and(
            eq(document_files.model_id, doc.id),
            eq(document_files.model_type, map.fqcn),
          ),
        ),
    ]);

    const confItem = (
      c: (typeof confRows)[number],
    ): Record<string, unknown> => ({
      id: c.id,
      status: {
        id: c.status,
        name: this.confStatusLabel(c.status, lang),
      },
      worker: c.worker_id
        ? {
            id: c.worker_id,
            uuid: c.worker_uuid,
            photo: null as string | null,
            last_name: c.worker_last,
            first_name: c.worker_first,
            middle_name: c.worker_middle,
            birthday: c.worker_birthday,
            pin: c.worker_pin,
          }
        : null,
      type: c.type,
      order: c.order,
      position: c.position,
    });

    const confirmations = await Promise.all(
      confRows.map(async (c) => {
        const item = confItem(c);
        if (item.worker && c.worker_photo) {
          (item.worker as Record<string, unknown>).photo =
            await this.minio.fileUrl(c.worker_photo);
        }
        return item;
      }),
    );

    return {
      document: {
        file_name: `${doc.uuid}.pdf`,
        url: await this.minio.fileUrl(doc.confirmation_file ?? null),
        doc_url: this.buildOnlyOfficeUrl(doc.uuid, query.model),
        // Laravel Carbon ISO8601 — `2026-04-29T12:00:30.000000Z`.
        created: this.toIso(doc.created_at),
        generate: doc.generate,
        organization_id: doc.organization_id,
        user: createdUser,
        confirmation: {
          id: doc.confirmation,
          name: this.confStatusLabel(doc.confirmation, lang),
        },
      },
      user: currentUserInfo,
      signature: {
        current_user: myConf ? confItem(myConf) : null,
        signature: myConf != null && myConf.status !== 3,
      },
      model: {
        id: query.model,
        name: map.label,
      },
      histories: Number(hCnt?.c ?? 0),
      chats: Number(cCnt?.c ?? 0),
      files: Number(fCnt?.c ?? 0),
      confirmations,
    };
  }

  // Laravel App\Http\Resources\User\UserInfoResource — {id, uuid, worker, phone}.
  private async loadUserInfo(userId: number) {
    const [u] = await this.db
      .select({
        id: usersTable.id,
        uuid: usersTable.uuid,
        phone: usersTable.phone,
        worker_id: usersTable.worker_id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!u) return null;
    let worker: Record<string, unknown> | null = null;
    if (u.worker_id) {
      const [w] = await this.db
        .select({
          id: workers.id,
          photo: workers.photo,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
        })
        .from(workers)
        .where(eq(workers.id, u.worker_id))
        .limit(1);
      if (w) {
        worker = {
          id: w.id,
          photo: await this.minio.fileUrl(w.photo),
          last_name: w.last_name,
          first_name: w.first_name,
          middle_name: w.middle_name,
        };
      }
    }
    return { id: u.id, uuid: u.uuid, worker, phone: u.phone };
  }

  // Postgres timestamp string → Laravel Carbon ISO8601 (`...T...000000Z`).
  private toIso(value: string | null): string | null {
    if (!value) return null;
    // `2026-04-29 12:00:30` yoki `2026-04-29 12:00:30.123` → ISO.
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(value);
    if (!m) return value;
    return `${m[1]}T${m[2]}.000000Z`;
  }

  private confStatusLabel(v: number | null, lang: string): string {
    if (v == null) return '';
    const key = CONFIRMATION_STATUS_KEYS[v];
    if (!key) return '';
    const val = this.i18n.t(key, { lang });
    return typeof val === 'string' ? val : '';
  }

  // Laravel Helper::documentSignedUrl — only-office temporarySignedRoute (30 min).
  private buildOnlyOfficeUrl(uuid: string, model: string): string {
    // OnlyOffice DS bu URL'dan faylni yuklab oladi. Lokalda DS docker
    // konteynerda — `localhost` unga ko'rinmaydi, shuning uchun
    // OO_FILE_BASE_URL=http://host.docker.internal:8001 bo'lishi mumkin.
    // Brauzerga ketadigan boshqa signed URL'lar (signature, application)
    // APP_URL=localhost'da qoladi. HMAC imzo host'ni o'z ichiga olmaydi.
    const baseUrl =
      this.config.get<string>('OO_FILE_BASE_URL') ||
      this.config.get<string>('APP_URL', 'http://localhost:8001');
    const appKey = this.config.get<string>('APP_KEY', 'dev-secret');
    const expires = Math.floor(Date.now() / 1000) + 60 * 30;
    const params = new URLSearchParams({ expires: String(expires), model });
    const signature = createHmac('sha256', appKey)
      .update(`only-office/file/${uuid}?${params.toString()}`)
      .digest('hex');
    params.set('signature', signature);
    return `${baseUrl}/api/only-office/file/${uuid}?${params.toString()}`;
  }

  // GET /api/v1/document/history — Laravel: $request->model + $request->document_id.
  async documentHistory(query: DocumentQueryDto) {
    return this.db
      .select()
      .from(document_histories)
      .where(
        and(
          eq(document_histories.model_id, query.document_id),
          eq(document_histories.model_type, query.model),
          notDeleted(document_histories),
        ),
      )
      .orderBy(desc(document_histories.id));
  }

  // GET /api/v1/document/generate-url?model=&confirmation_id=
  // Laravel: DocumentSignatureUrlService::generate — token signature_urls jadvaliga
  // saqlanadi (sha256 hash), foydalanuvchiga xom token bilan URL qaytariladi.
  async generateConfirmationUrl(query: GenerateConfirmationUrlDto) {
    const map = MODEL_TYPE_TABLE_MAP[query.model];
    if (!map) {
      throw new BusinessException(404, this.i18n.t('error.model_not_found'));
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const confTable = map.conf as any;
    const dTable = map.doc as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // 1) Confirmation — model'ning {fk} (masalan command_id) ustunini olamiz.
    const [conf] = await this.db
      .select({ id: confTable.id, doc_id: confTable[map.fk] })
      .from(confTable)
      .where(eq(confTable.id, query.confirmation_id))
      .limit(1);
    if (!conf) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // 2) Hujjat (document) — `file` ustuni.
    const [doc] = await this.db
      .select({ file: dTable.file })
      .from(dTable)
      .where(and(eq(dTable.id, conf.doc_id), notDeleted(dTable)))
      .limit(1);
    if (!doc) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // 3) Token — xom token URL'da, sha256 hash DB'da (Laravel Str::random(64)).
    const rawToken = randomBytes(48).toString('base64url').slice(0, 64);
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    // updateOrCreate (model, confirmation_id) — unique constraint mavjud.
    await this.db
      .insert(signature_urls)
      .values({
        model: query.model,
        confirmation_id: query.confirmation_id,
        token: hashedToken,
        expires_at: sql`NOW() + INTERVAL '1 day'`,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: [signature_urls.model, signature_urls.confirmation_id],
        set: {
          token: hashedToken,
          expires_at: sql`NOW() + INTERVAL '1 day'`,
          updated_at: sql`NOW()`,
        },
      });

    const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:8001');
    return {
      url: `${baseUrl}/api/v1/document/signature?token=${rawToken}`,
      file: await this.minio.fileUrl(doc.file),
    };
  }

  // POST /api/v1/document/signature?token=  — Laravel: signWithToken.
  // token=check → hujjatni ko'rish, aks holda biometrik imzo qo'yiladi.
  async signWithToken(
    token: string | undefined,
    dto: DocumentSignTokenDto,
  ): Promise<{ data?: Record<string, unknown>; message?: string }> {
    if (!token) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.token_is_expired'),
      );
    }
    const hashed = createHash('sha256').update(token).digest('hex');

    // 1) Token signature_urls'da bo'lishi va muddati o'tmagan bo'lishi kerak.
    const [record] = await this.db
      .select({
        model: signature_urls.model,
        confirmation_id: signature_urls.confirmation_id,
      })
      .from(signature_urls)
      .where(
        and(
          eq(signature_urls.token, hashed),
          gt(signature_urls.expires_at, sql`NOW()`),
        ),
      )
      .limit(1);
    if (!record) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.token_is_expired'),
      );
    }

    const map = MODEL_TYPE_TABLE_MAP[record.model];
    if (!map) {
      throw new BusinessException(404, this.i18n.t('error.model_not_found'));
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const confTable = map.conf as any;
    const dTable = map.doc as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // 2) Confirmation + worker.
    const [conf] = await this.db
      .select({
        id: confTable.id,
        status: confTable.status,
        type: confTable.type,
        position: confTable.position,
        doc_id: confTable[map.fk],
        worker_id: workers.id,
        worker_uuid: workers.uuid,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_birthday: workers.birthday,
        worker_pin: workers.pin,
      })
      .from(confTable)
      .leftJoin(workers, eq(workers.id, confTable.worker_id))
      .where(eq(confTable.id, record.confirmation_id))
      .limit(1);
    if (!conf) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.document.not_found'),
      );
    }

    // 3) Hujjat.
    const [doc] = await this.db
      .select()
      .from(dTable)
      .where(eq(dTable.id, conf.doc_id))
      .limit(1);
    if (!doc) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.document.not_found'),
      );
    }

    const workerInfo = conf.worker_id
      ? {
          id: conf.worker_id,
          uuid: conf.worker_uuid,
          photo: await this.minio.fileUrl(conf.worker_photo),
          last_name: conf.worker_last,
          first_name: conf.worker_first,
          middle_name: conf.worker_middle,
          birthday: conf.worker_birthday,
          pin: conf.worker_pin,
        }
      : null;

    // 4) status=check — imzolamasdan ko'rish (read-only).
    if (dto.status === 'check') {
      return {
        data: {
          url: await this.minio.fileUrl(doc.confirmation_file ?? null),
          worker: workerInfo,
          position: conf.position,
          status: conf.status,
        },
      };
    }

    // 5) Imzolash — allaqachon imzolangan (SUCCESS=3) bo'lsa xato.
    if (conf.status === 3) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.document.already_signed'),
      );
    }

    // confirmation_type=2 (BIOMETRIC), signature rasmi, status=3 (SUCCESS).
    await this.db
      .update(confTable)
      .set({
        confirmation_type: 2,
        signature: dto.key ?? null,
        status: 3,
        updated_at: sql`NOW()`,
      })
      .where(eq(confTable.id, conf.id));

    // 6) Barcha confirmations imzolangan bo'lsa — hujjat confirmation=SUCCESS.
    const [pendingRow] = await this.db
      .select({ pending: count() })
      .from(confTable)
      .where(and(eq(confTable[map.fk], conf.doc_id), ne(confTable.status, 3)));
    if (Number(pendingRow?.pending ?? 0) === 0) {
      await this.db
        .update(dTable)
        .set({ confirmation: 3, updated_at: sql`NOW()` })
        .where(eq(dTable.id, conf.doc_id));
    }

    return { message: this.i18n.t('messages.document.signed_successfully') };
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

  // POST /api/v1/document/update (only_office_ip middleware)
  // Laravel: DocumentEditorCallbackService::handle — OnlyOffice tahrir callback.
  // status: 1=editing, 2=ready to save, 3=save error, 4=closed, 6=force save.
  async updateDocument(
    query: DocumentUpdateQueryDto,
    dto: DocumentUpdateDto,
  ): Promise<{ error: number }> {
    const OO_READY = 2; // tahrir tugadi, saqlash kerak
    const OO_FORCE = 6; // force save (avtosaqlash)

    // Faqat saqlash statuslari — qolganlarida hech narsa qilmaymiz.
    if (dto.status !== OO_READY && dto.status !== OO_FORCE) {
      return { error: 0 };
    }
    if (!dto.url) {
      return { error: 0 };
    }

    // Tahrirlangan fayl URL hostini tekshirish (faqat ishonchli serverlar).
    const allowedHosts = ['hrm-api.railway.uz', 'office.dasuty.com'];
    let host: string;
    try {
      host = new URL(dto.url).hostname;
    } catch {
      return { error: 1 };
    }
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (!isLocal && !allowedHosts.includes(host)) {
      return { error: 1 };
    }

    // Hujjatni topish.
    const map = MODEL_TYPE_TABLE_MAP[query.model];
    if (!map) return { error: 1 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dTable = map.doc as any;
    const [doc] = await this.db
      .select()
      .from(dTable)
      .where(and(eq(dTable.id, query.document_id), notDeleted(dTable)))
      .limit(1);
    if (!doc) return { error: 1 };

    // Allaqachon tasdiqlangan (SUCCESS=3) hujjatni o'zgartirmaymiz.
    if (doc.confirmation === 3) {
      return { error: 0 };
    }

    // Tahrirlangan DOCX faylni OnlyOffice serveridan yuklab olish.
    let docxBuffer: Buffer;
    try {
      const res = await fetch(dto.url);
      if (!res.ok) return { error: 1 };
      docxBuffer = Buffer.from(await res.arrayBuffer());
    } catch {
      return { error: 1 };
    }

    // MinIO key — mavjud fayl yo'lini qayta ishlatamiz, bo'lmasa yangi yaratamiz.
    let docxKey: string;
    if (doc.file) {
      docxKey = doc.file as string;
    } else {
      const base = query.file_url
        ? this.basename(query.file_url)
        : `${doc.uuid ?? query.document_id}.docx`;
      docxKey = `${query.model}/${base}`;
    }
    await this.minio.putObject(
      docxKey,
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // PDF konvertatsiya (Laravel DocxToPdfJob) — best-effort: xato bo'lsa ham
    // DOCX baribir saqlangan, faqat confirmation_file yangilanmaydi.
    const updateData: Record<string, unknown> = {
      file: docxKey,
      updated_at: sql`NOW()`,
    };
    try {
      const pdfBuffer = await this.convert.docxToPdf(docxBuffer);
      const pdfKey = docxKey.replace(/\.[^./]+$/, '') + '.pdf';
      await this.minio.putObject(pdfKey, pdfBuffer, 'application/pdf');
      updateData.confirmation_file = pdfKey;
    } catch {
      // PDF konvertatsiya muvaffaqiyatsiz — DOCX baribir saqlandi.
    }

    await this.db.update(dTable).set(updateData).where(eq(dTable.id, doc.id));

    return { error: 0 };
  }

  // URL yoki path'dan fayl nomini ajratib olish (Laravel basename(parse_url(...))).
  private basename(urlOrPath: string): string {
    let path = urlOrPath;
    try {
      path = new URL(urlOrPath).pathname;
    } catch {
      // raw path — o'zgartirmasdan ishlatamiz
    }
    const name = path.split('/').filter(Boolean).pop();
    return name && name.length ? name : 'document.docx';
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
