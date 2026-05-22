// Integration mobile-face controller. Laravel: hmac.auth middleware.
// Bu yerda Public sifatida ochilgan (HMAC implementation keyin).

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationMobileFaceService } from '@/modules/integration/mobile-face/mobile-face.service';

@ApiTags('Integration / Mobile Face')
@Controller('api/v1/integration/mobile-face')
export class IntegrationMobileFaceController {
  constructor(private readonly service: IntegrationMobileFaceService) {}

  @Public()
  @Post('send-event')
  @ApiOperation({ summary: 'Mobile face send event (HMAC, public stub)' })
  async sendEvent(@Body() body: unknown) {
    return buildSuccess(true, await this.service.sendEvent(body));
  }

  @Public()
  @Post('check-worker')
  @ApiOperation({ summary: 'Mobile face check worker (HMAC, public stub)' })
  async checkWorker(@Body() body: unknown) {
    return buildSuccess(true, await this.service.checkWorker(body));
  }

  @Public()
  @Post('schedules')
  @ApiOperation({ summary: 'Mobile face schedules (HMAC, public stub)' })
  async schedules(@Body() body: unknown) {
    return buildSuccess(true, await this.service.schedules(body));
  }
}
