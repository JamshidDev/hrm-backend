// Zoom webhook controller. Laravel: zoom/webhook route — Public (no auth).

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { LmsZoomWebhookService } from '@/modules/lms/zoom-webhook/zoom-webhook.service';

@ApiTags('Zoom / Webhook')
@Controller('api/v1/zoom')
export class LmsZoomWebhookController {
  constructor(private readonly service: LmsZoomWebhookService) {}

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Zoom event webhook (public, no auth)' })
  async webhook(@Body() body: unknown) {
    return buildSuccess(true, await this.service.handle(body));
  }
}
