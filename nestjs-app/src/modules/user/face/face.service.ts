// User Face service. Laravel: FaceRecognitionService + UserService (verifyToken, updateUserPhotos).
// 5 endpoint: face/recognition, face/liveness/start, socket/verify-token,
//             socket/users-photos, mobile/turnstile-start-liveness (mobile'da bor).
// Real implement Face SDK kerak.

import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { liveness_sessions } from '@/db/schema';
import { randomUUID } from 'node:crypto';
import type {
  FaceRecognitionDto,
  UpdateUserPhotosDto,
} from '@/modules/user/face/dto/face.dto';

@Injectable()
export class UserFaceService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  /**
   * POST /user/face/recognition — Laravel FaceRecognitionService.recognize.
   * Stub: real implement face match SDK.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async recognize(_dto: FaceRecognitionDto, _deviceUuid?: string) {
    return { status: 'pending', stub: true };
  }

  /**
   * POST /user/face/liveness/start — face_check liveness session.
   * Laravel: FaceRecognitionService.startSession(userId, deviceUuid, 'face_check').
   */
  async startSession(deviceUuid?: string) {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');
    const sessionId = randomUUID();
    await this.db.insert(liveness_sessions).values({
      session_id: sessionId,
      user_id: userId,
      status: 'started',
      success: false,
      device_uuid: deviceUuid ?? null,
      type: 'face_check',
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    return { session_id: sessionId };
  }

  /** GET /user/socket/verify-token — socket server uchun token verify. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyToken() {
    const userId = this.ctx.user?.id;
    if (!userId) throw new BusinessException(401, 'unauthorized');
    return { valid: true, user_id: userId };
  }

  /** POST /user/socket/users-photos — bir nechta user photolarini yangilash (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async updateUserPhotos(dto: UpdateUserPhotosDto) {
    return {
      success: true,
      stub: true,
      updated: dto.user_ids.length,
    };
  }
}

/** Service injection orqali eq+stmt mismatch'larni oldini olish uchun re-export. */
export const _internal = { eq };
