// Zoom webhook service. Laravel: ZoomService::handleWebhook + ZoomController::callback.
//   - payload.object.id bo'lsa → zoom_meetings (zoom_id) topib zoom_meeting_events yozadi
//   - event === 'endpoint.url_validation' → {plainToken, encryptedToken: HMAC-SHA256}

import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { zoom_meetings, zoom_meeting_events } from '@/db/schema';
import { ZoomService } from '@/shared/zoom/zoom.service';

interface ZoomWebhookBody {
  event?: string;
  payload?: {
    object?: { id?: number | string };
    plainToken?: string;
    [k: string]: unknown;
  };
}

@Injectable()
export class LmsZoomWebhookService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly zoom: ZoomService,
  ) {}

  // POST /api/v1/zoom/webhook — Public, Zoom serveridan keladi.
  async handle(
    body: ZoomWebhookBody,
  ): Promise<{ plainToken: string; encryptedToken: string } | null> {
    const payload = body?.payload ?? {};
    const objectId = payload.object?.id;

    if (objectId != null) {
      const [meet] = await this.db
        .select({ id: zoom_meetings.id })
        .from(zoom_meetings)
        .where(eq(zoom_meetings.zoom_id, Number(objectId)))
        .limit(1);
      if (!meet) {
        throw new BusinessException(
          404,
          this.i18n.t('messages.zoom.not_found'),
        );
      }

      const [{ eid }] = await this.db
        .select({ eid: sql<number>`COALESCE(MAX(id), 0)::int + 1` })
        .from(zoom_meeting_events);
      await this.db.insert(zoom_meeting_events).values({
        id: eid,
        event: body.event ?? '',
        zoom_meeting_id: meet.id,
        details: payload,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
    }

    // Zoom endpoint URL validation challenge (HMAC-SHA256).
    if (body?.event === 'endpoint.url_validation') {
      const plainToken = payload.plainToken ?? '';
      return {
        plainToken,
        encryptedToken: createHmac('sha256', this.zoom.eventSecret)
          .update(plainToken)
          .digest('hex'),
      };
    }

    return null;
  }
}
