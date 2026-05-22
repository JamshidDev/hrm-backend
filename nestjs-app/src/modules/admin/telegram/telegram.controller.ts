// Admin Telegram controller. Laravel: TelegramController + TelegramPushController.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { AdminTelegramService } from '@/modules/admin/telegram/telegram.service';
import {
  TelegramAccountsQueryDto,
  TelegramDetachDto,
  TelegramUsersQueryDto,
} from '@/modules/admin/telegram/dto/telegram.dto';

@ApiTags('Admin / Telegram')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/admin/telegram')
export class AdminTelegramController {
  constructor(private readonly service: AdminTelegramService) {}

  @Get('users')
  @ApiOperation({ summary: 'List telegram accounts (paginated + search)' })
  async listAccounts(@Query() q: TelegramAccountsQueryDto) {
    return buildSuccess(true, await this.service.listAccounts(q));
  }

  @Post('users/send-message')
  @HttpCode(200)
  @ApiOperation({ summary: 'Broadcast push (stub — Laravel queued job)' })
  async sendMessage() {
    return buildSuccess(true, await this.service.sendMessage());
  }

  @Get('bot/users')
  @ApiOperation({ summary: 'List bot users (paginated, birthdays filter)' })
  async listBotUsers(@Query() q: TelegramUsersQueryDto) {
    return buildSuccess(true, await this.service.listBotUsers(q));
  }

  @Post('bot/users-detach')
  @HttpCode(200)
  @ApiOperation({ summary: 'Detach (deactivate) bot users by chat_ids' })
  async detachUsers(@Body() dto: TelegramDetachDto) {
    return buildSuccess(true, await this.service.detachUsers(dto));
  }
}
