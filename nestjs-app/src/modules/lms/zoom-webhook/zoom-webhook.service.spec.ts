// LmsZoomWebhookService unit testlari.

import { LmsZoomWebhookService } from '@/modules/lms/zoom-webhook/zoom-webhook.service';

describe('LmsZoomWebhookService', () => {
  it('Har qanday body uchun success:true qaytaradi', async () => {
    const svc = new LmsZoomWebhookService();
    expect(await svc.handle({})).toEqual({ success: true });
    expect(await svc.handle({ event: 'meeting.started' })).toEqual({
      success: true,
    });
    expect(await svc.handle(null)).toEqual({ success: true });
    expect(await svc.handle({ payload: { object: { uuid: 'abc' } } })).toEqual({
      success: true,
    });
  });
});
