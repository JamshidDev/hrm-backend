// Integration mobile-face controller. Laravel: hmac.auth middleware.
// Bu yerda Public sifatida ochilgan (HMAC implementation keyin).

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationMobileFaceService } from '@/modules/integration/mobile-face/mobile-face.service';
import {
  MobileFaceCheckWorkerDto,
  MobileFaceSchedulesDto,
  MobileFaceSendEventDto,
} from '@/modules/integration/mobile-face/dto/mobile-face.dto';

@ApiTags('Integration / Mobile Face')
@Controller('api/v1/integration/mobile-face')
export class IntegrationMobileFaceController {
  constructor(private readonly service: IntegrationMobileFaceService) {}

  @Public()
  @Post('send-event')
  @ApiOperation({ summary: 'Mobile face send event' })
  async sendEvent(@Body() dto: MobileFaceSendEventDto) {
    return buildSuccess(true, await this.service.sendEvent(dto));
  }

  @Public()
  @Post('check-worker')
  @ApiOperation({ summary: 'Mobile face check worker' })
  async checkWorker(@Body() dto: MobileFaceCheckWorkerDto) {
    return buildSuccess(true, await this.service.checkWorker(dto));
  }

  @Public()
  @Post('schedules')
  @ApiOperation({ summary: 'Mobile face schedules' })
  async schedules(@Body() dto: MobileFaceSchedulesDto) {
    return buildSuccess(true, await this.service.schedules(dto));
  }
}
