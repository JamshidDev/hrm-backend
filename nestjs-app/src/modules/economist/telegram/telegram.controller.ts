// Economist telegram controller. Laravel: Economist/TelegramController.
// Public endpointlar (Laravel `economist-bot-token` middleware bilan;
// hozircha Nest tarafda public + Bot-Token header ixtiyoriy).

import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { EconomistTelegramGuard } from '@/common/guards/economist-telegram.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { EconomistTelegramService } from '@/modules/economist/telegram/telegram.service';
import {
  TelegramLoginDto,
  TelegramCheckUserQueryDto,
  TelegramMonthsQueryDto,
  TelegramSalaryQueryDto,
} from '@/modules/economist/telegram/dto/telegram.dto';

@ApiTags('Economist / Telegram')
// Laravel EconomistTelegramMiddleware — Bot-Token → organizations.bot_token lookup,
// topilmasa 401. @Public global sanctum'ni bypass qiladi.
@Public()
@UseGuards(EconomistTelegramGuard)
@Controller('api/v1/economist/telegram')
export class EconomistTelegramController {
  constructor(private readonly service: EconomistTelegramService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Telegram bot login (pin + chat_id)' })
  async login(
    @Body() body: TelegramLoginDto,
    @Headers('bot-token') botToken?: string,
  ) {
    return buildSuccess(true, await this.service.login(body, botToken));
  }

  @Public()
  @Get('months')
  @ApiOperation({ summary: 'Worker uchun mavjud (year, month) ro`yxati' })
  async months(@Query() q: TelegramMonthsQueryDto) {
    return buildSuccess(true, await this.service.months(q));
  }

  @Public()
  @Get('check-user')
  @ApiOperation({ summary: 'chat_id + bot-token bo`yicha worker topish' })
  async checkUser(
    @Query() q: TelegramCheckUserQueryDto,
    @Headers('bot-token') botToken?: string,
  ) {
    return buildSuccess(true, await this.service.checkUser(q, botToken));
  }

  @Public()
  @Get('salary')
  @ApiOperation({ summary: 'Worker uchun belgilangan oy uchun maosh hisoboti' })
  async salary(@Query() q: TelegramSalaryQueryDto) {
    return buildSuccess(true, await this.service.salary(q));
  }
}
