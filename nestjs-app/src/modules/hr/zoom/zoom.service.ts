// Zoom service. Laravel: App\Services\ZoomService::checkMeeting.
// zoom_meetings'dan uchrashuvni topib, muddati/statusini tekshiradi.

import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { zoom_meetings } from '@/db/schema';

@Injectable()
export class ZoomService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Laravel ZoomService::checkMeeting — uchrashuvni topadi, tugash vaqti/statusini
   * tekshiradi va start_url/join_url qaytaradi.
   */
  async checkMeeting(
    meetUuid: string,
    meetId: string,
  ): Promise<{ start_url: string | null; join_url: string | null }> {
    const [meet] = await this.db
      .select({
        meet_date_and_time: zoom_meetings.meet_date_and_time,
        duration: zoom_meetings.duration,
        status: zoom_meetings.status,
        details: zoom_meetings.details,
      })
      .from(zoom_meetings)
      .where(
        and(
          eq(zoom_meetings.zoom_uuid, meetUuid),
          eq(zoom_meetings.zoom_id, Number(meetId)),
        ),
      )
      .limit(1);

    if (!meet) {
      throw new BusinessException(
        404,
        this.i18n.t('messages.meet_not_found'),
        [],
      );
    }

    // endsAt = meet_date_and_time + duration daqiqa.
    const endsAt =
      new Date(meet.meet_date_and_time).getTime() + meet.duration * 60_000;
    if (endsAt <= Date.now()) {
      throw new BusinessException(
        403,
        this.i18n.t('messages.meet_not_available'),
        [],
      );
    }

    // status === 2 → tugagan.
    if (meet.status === 2) {
      throw new BusinessException(403, this.i18n.t('messages.meet_ended'), []);
    }

    const details = (meet.details ?? {}) as Record<string, unknown>;
    return {
      start_url: (details.start_url as string) ?? null,
      join_url: (details.join_url as string) ?? null,
    };
  }
}
