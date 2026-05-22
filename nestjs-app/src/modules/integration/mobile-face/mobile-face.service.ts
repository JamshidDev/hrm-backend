// Integration mobile-face service. Laravel: MobileFaceController.
// HMAC auth orqali himoyalangan, bu yerda stub Public sifatida.

import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegrationMobileFaceService {
  /** POST /integration/mobile-face/send-event — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async sendEvent(_body: unknown) {
    return { success: true, stub: true };
  }

  /** POST /integration/mobile-face/check-worker — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async checkWorker(_body: unknown) {
    return { exists: false, stub: true };
  }

  /** POST /integration/mobile-face/schedules — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async schedules(_body: unknown) {
    return { stub: true, data: [] };
  }
}
