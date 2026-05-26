// HikCentral Telegram controller.
// Laravel: TelegramPhotoController + UserDeviceNotifyController.

import {
  Body,
  Controller,
  Delete,
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
import { TelegramService } from '@/modules/turnstile/hik-central-telegram/telegram.service';

@ApiTags('Turnstile / HikCentral Telegram')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/hik-central')
export class TelegramController {
  constructor(
    private readonly service: TelegramService,
    private readonly i18n: I18nService,
  ) {}

  @Get('telegram/photos') async photos(@Query() q: any) {
    return buildSuccess(true, await this.service.listPhotos(q));
  }

  @Post('telegram/photos/update') async updatePhotos(@Body() body: any) {
    await this.service.updatePhotos(body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('telegram') async list(@Query() q: any) {
    return buildSuccess(true, await this.service.telegramList(q));
  }

  @Post('telegram') async store(@Body() body: any) {
    await this.service.telegramStore(body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('telegram-users') async users(@Query() q: any) {
    return buildSuccess(true, await this.service.telegramUsers(q));
  }

  @Get('all-devices') async allDevices() {
    return buildSuccess(true, await this.service.allDevices());
  }

  @Get('telegram/:userId') async edit(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return buildSuccess(true, await this.service.telegramEdit(userId));
  }

  @Delete('telegram/:userId') async destroy(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.service.telegramDestroy(userId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
