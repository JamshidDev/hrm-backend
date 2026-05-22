// Zoom webhook service. Laravel: ZoomWebhookController.
// Zoom event'larini qabul qiladi (meeting.started, meeting.ended, etc.).
// Real implementation: signature verify + event dispatch.

import { Injectable } from '@nestjs/common';

@Injectable()
export class LmsZoomWebhookService {
  /**
   * POST /api/v1/zoom/webhook — Public, Zoom serveridan keladi.
   * Stub: hozircha event'ni qabul qilamiz va `success:true` qaytaramiz.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(_body: unknown) {
    return { success: true };
  }
}
