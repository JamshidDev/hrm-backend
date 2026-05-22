// Telegram bot controller. Laravel: TelegramController.
// 9 endpoint, Laravel telegram middleware bilan himoyalangan.
// NestJS hozircha Public — middleware real implement keyin.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { TelegramBotService } from '@/modules/telegram-bot/telegram-bot.service';
import {
  TelegramCheckDto,
  TelegramRegisterDto,
  TelegramServiceQueryDto,
  TelegramSetServiceDto,
} from '@/modules/telegram-bot/dto/telegram-bot.dto';

@ApiTags('Telegram Bot')
@Public()
@Controller('api/v1/telegram')
export class TelegramBotController {
  constructor(
    private readonly service: TelegramBotService,
    private readonly i18n: I18nService,
  ) {}

  @Get('auth/:chatId')
  @ApiOperation({ summary: 'User info by chat_id' })
  async getUserInfo(@Param('chatId', ParseIntPipe) chatId: number) {
    return buildSuccess(true, await this.service.userInfoByChatId(chatId));
  }

  @Post('auth/check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check worker by phone + pin' })
  async check(@Body() dto: TelegramCheckDto) {
    return buildSuccess(true, await this.service.check(dto));
  }

  @Post('auth/register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register telegram chat for worker (by uuid)' })
  async register(@Body() dto: TelegramRegisterDto) {
    await this.service.register(dto);
    return buildSuccess(true, { success: true });
  }

  @Delete('auth/:chatId')
  @ApiOperation({ summary: 'Soft-deactivate chat' })
  async destroy(@Param('chatId', ParseIntPipe) chatId: number) {
    await this.service.deactivate(chatId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Current bot user profile (stub)' })
  async profile() {
    return buildSuccess(true, await this.service.profile());
  }

  @Get('petition-types')
  @ApiOperation({ summary: 'Petition types' })
  petitionTypes() {
    return buildSuccess(true, this.service.petitionTypes());
  }

  @Get('menu/services')
  @ApiOperation({ summary: 'List bot menu services' })
  async services() {
    return buildSuccess(true, await this.service.listServices());
  }

  @Get('menu/get-service')
  @ApiOperation({ summary: 'Get service by md5 hash (stub)' })
  async getService(@Query() q: TelegramServiceQueryDto) {
    return buildSuccess(true, await this.service.getService(q));
  }

  @Post('menu/set-service')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set service (stub)' })
  async setService(@Body() dto: TelegramSetServiceDto) {
    return buildSuccess(true, await this.service.setService(dto));
  }
}
