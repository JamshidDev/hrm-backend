// Auth Liveness service. Laravel: FaceRecognitionService (startLoginSession, validateSession, completeSession).
// 3 endpoint — face liveness session login uchun.
// Real implementation Face SDK + storage (refImage/liveImage MinIO upload).

import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { liveness_sessions, users } from '@/db/schema';
import { randomUUID } from 'node:crypto';
import type {
  CompleteLivenessDto,
  StartLivenessDto,
  ValidateLivenessDto,
} from '@/modules/auth/liveness/dto/liveness.dto';

@Injectable()
export class LivenessService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * POST /auth/v1/liveness/start — login uchun liveness session start.
   * phone bo'yicha user'ni topib, yangi session yaratamiz.
   */
  async startSession(dto: StartLivenessDto, deviceUuid?: string) {
    const phoneNum = Number(dto.phone);
    if (!Number.isFinite(phoneNum)) {
      throw new BusinessException(422, 'invalid_phone');
    }
    const [u] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, phoneNum))
      .limit(1);
    if (!u) {
      throw new BusinessException(404, 'user_not_found');
    }
    const sessionId = randomUUID();
    await this.db.insert(liveness_sessions).values({
      session_id: sessionId,
      user_id: u.id,
      status: 'started',
      success: false,
      device_uuid: deviceUuid ?? null,
      type: 'login',
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    return { session_id: sessionId };
  }

  /**
   * POST /auth/v1/liveness/validate — socket-server signed.
   * Sessionni mavjudligini tekshirib, status qaytaradi.
   */
  async validate(dto: ValidateLivenessDto) {
    const [row] = await this.db
      .select()
      .from(liveness_sessions)
      .where(eq(liveness_sessions.session_id, dto.session_id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'session_not_found');
    return {
      session_id: row.session_id,
      status: row.status,
      success: row.success,
    };
  }

  /**
   * POST /auth/v1/liveness/complete — socket-server signed.
   * Sessionni completed status'iga o'tkazadi.
   */
  async complete(dto: CompleteLivenessDto) {
    const [row] = await this.db
      .update(liveness_sessions)
      .set({
        status: 'completed',
        success: dto.success ?? false,
        refImage: dto.refImage ?? null,
        liveImage: dto.liveImage ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(liveness_sessions.session_id, dto.session_id))
      .returning({ session_id: liveness_sessions.session_id });
    if (!row) throw new BusinessException(404, 'session_not_found');
    return { session_id: row.session_id };
  }
}
