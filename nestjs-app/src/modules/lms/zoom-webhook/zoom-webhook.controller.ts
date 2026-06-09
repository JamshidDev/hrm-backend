// Zoom webhook controller. Laravel: zoom/webhook route — Public (no auth).

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { LmsZoomWebhookService } from '@/modules/lms/zoom-webhook/zoom-webhook.service';

@ApiTags('Zoom / Webhook')
@Controller('api/v1/zoom')
export class LmsZoomWebhookController {
  constructor(private readonly service: LmsZoomWebhookService) {}

  // Laravel: response()->json($validation ?? ['status' => 'ok']) — xom javob
  // (Zoom url_validation {plainToken, encryptedToken}'ni kutadi).
  @Public()
  @Post('webhook')
  @RawResponse()
  @ApiOperation({ summary: 'Zoom event webhook (public, no auth)' })
  async webhook(@Body() body: Record<string, unknown>) {
    const result = await this.service.handle(body);
    return result ?? { status: 'ok' };
  }
}
