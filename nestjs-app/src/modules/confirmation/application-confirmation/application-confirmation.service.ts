// Application confirmation service. Laravel: WorkerApplicationService::confirmBySignature.
//
// Oqim (Laravel parity):
//   1. signed-URL imzosini tekshirish (APP_KEY HMAC + expires) — hasValidSignature.
//   2. JWT token decode (JWT_SECRET) → {application, expires}.
//   3. token expires tekshirish.
//   4. WorkerApplication topish (findOrFail).
//   5. status==='check' → {application}; aks holda confirmation yaratib {file}.
//
// MUHIM (env): JWT_SECRET ikkala app'da bir xil bo'lishi kerak; Laravel imzolagan
// URL'lar tekshirilishi uchun APP_KEY ham bir xil bo'lishi shart.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MinioService } from '@/shared/minio/minio.service';
import {
  worker_applications,
  worker_application_confirmations,
  confirmation_workers,
  workers,
} from '@/db/schema';
import type { ApplicationConfirmationDto } from '@/modules/confirmation/application-confirmation/dto/application-confirmation.dto';

// Modules\Confirmation\Enums — SUCCESS=3, BIOMETRIC=2.
const CONFIRMATION_STATUS_SUCCESS = 3;
const CONFIRMATION_TYPE_BIOMETRIC = 2;

interface SignedRequest {
  path: string; // /api/v1/document/application-confirmation
  query: Record<string, string | undefined>;
  rawQuery: string; // imzodan tashqari original query string
}

@Injectable()
export class ApplicationConfirmationService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  async confirmBySignature(
    dto: ApplicationConfirmationDto,
    req: SignedRequest,
  ): Promise<Record<string, unknown>> {
    // 1. hasValidSignature.
    this.assertValidSignature(req);

    // 2. JWT decode (JWT_SECRET ?? 'dev-secret' — admin-user bilan bir xil konvensiya).
    const secret = this.config.get<string>('JWT_SECRET') ?? 'dev-secret';
    let data: { application?: number; expires?: number };
    try {
      data = jwt.verify(dto.token, secret) as typeof data;
    } catch {
      throw new BusinessException(
        400,
        this.i18n.t('messages.token_is_expired'),
      );
    }

    // 3. token expires (Laravel: $data->expires < now()->timestamp).
    const nowTs = Math.floor(Date.now() / 1000);
    if (data.expires != null && data.expires < nowTs) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.token_is_expired'),
      );
    }

    // 4. WorkerApplication::with('director.worker')->findOrFail.
    const [application] = await this.db
      .select()
      .from(worker_applications)
      .where(eq(worker_applications.id, Number(data.application)))
      .limit(1);
    if (!application) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // director (confirmation_workers, director_id) + worker.
    const director = application.director_id
      ? await this.loadDirector(application.director_id)
      : null;

    // 5a. status === 'check' → application qaytariladi.
    if (dto.status === 'check') {
      return {
        application: {
          ...application,
          file: await this.minio.fileUrl(application.file),
          confirmation_file: await this.minio.fileUrl(
            application.confirmation_file,
          ),
          director,
        },
      };
    }

    // 5b. confirmation yaratish (type='d', SUCCESS, BIOMETRIC).
    await this.db.insert(worker_application_confirmations).values({
      worker_application_id: application.id,
      worker_id: director?.worker_id ?? null,
      type: 'd',
      signature: dto.key,
      status: CONFIRMATION_STATUS_SUCCESS,
      confirmation_type: CONFIRMATION_TYPE_BIOMETRIC,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });

    return { file: application.file };
  }

  // director relation — confirmation_workers + worker.
  private async loadDirector(directorId: number) {
    const [d] = await this.db
      .select({
        id: confirmation_workers.id,
        worker_id: confirmation_workers.worker_id,
        position: confirmation_workers.position,
        w_id: workers.id,
        w_uuid: workers.uuid,
        w_photo: workers.photo,
        w_last: workers.last_name,
        w_first: workers.first_name,
        w_middle: workers.middle_name,
        w_pin: workers.pin,
      })
      .from(confirmation_workers)
      .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
      .where(eq(confirmation_workers.id, directorId))
      .limit(1);
    if (!d) return null;
    return {
      id: d.id,
      worker_id: d.worker_id,
      position: d.position,
      worker: d.w_id
        ? {
            id: d.w_id,
            uuid: d.w_uuid,
            photo: await this.minio.fileUrl(d.w_photo),
            last_name: d.w_last,
            first_name: d.w_first,
            middle_name: d.w_middle,
            pin: d.w_pin,
          }
        : null,
    };
  }

  // Laravel hasValidSignature: HMAC-SHA256(url-without-signature, APP_KEY) + expires.
  private assertValidSignature(req: SignedRequest): void {
    const signature = req.query.signature;
    const expires = req.query.expires;
    if (!signature) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.token_is_expired'),
      );
    }
    // expires (temporarySignedRoute) — UNIX timestamp.
    if (expires != null) {
      const expNum = Number(expires);
      if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) {
        throw new BusinessException(
          403,
          this.i18n.t('messages.token_is_expired'),
        );
      }
    }
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:8001');
    const appKey = this.config.get<string>('APP_KEY', 'dev-secret');
    const original = `${appUrl}${req.path}?${req.rawQuery}`;
    const expected = createHmac('sha256', appKey)
      .update(original)
      .digest('hex');
    const ok =
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!ok) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.token_is_expired'),
      );
    }
  }
}
