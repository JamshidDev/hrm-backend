// HikCentral Event controller. Laravel: EventController.

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { EventService } from '@/modules/turnstile/hik-central-events/event.service';

@ApiTags('Turnstile / HikCentral Events')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class EventController {
  constructor(
    private readonly service: EventService,
    private readonly i18n: I18nService,
  ) {}

  @Get('events') async list(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('events-new') async newStyle(@Query() q: any) {
    return buildSuccess(true, await this.service.newStyleEvents(q));
  }

  @Get('work-durations') async durations(@Query() q: any) {
    return buildSuccess(true, await this.service.durations(q));
  }

  @Get('work-durations/:workerId') async showWorker(
    @Param('workerId', ParseIntPipe) workerId: number,
    @Query() q: any,
  ) {
    return buildSuccess(true, await this.service.durationsForWorker(workerId, q));
  }

  @Get('work-durations/:workerId/events') async eventsInDay(
    @Param('workerId', ParseIntPipe) workerId: number,
    @Query() q: any,
  ) {
    return buildSuccess(true, await this.service.eventsInDay(workerId, q));
  }

  @Post('events/sync') async sync(@Body() body: any) {
    return buildSuccess(
      this.i18n.t('messages.successfully_exported') as string,
      await this.service.syncEvents(body),
    );
  }
}
