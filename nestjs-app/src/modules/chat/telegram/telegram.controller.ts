// Chat telegram controller. Laravel: TelegramController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ChatTelegramService } from '@/modules/chat/telegram/telegram.service';
import { TelegramMessagesQueryDto } from '@/modules/chat/telegram/dto/telegram.dto';

@ApiTags('Chat / Telegram')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/telegram')
export class ChatTelegramController {
  constructor(private readonly service: ChatTelegramService) {}

  @Get('messages')
  @ApiOperation({ summary: 'Telegram messages history (paginated)' })
  async messages(@Query() q: TelegramMessagesQueryDto) {
    return buildSuccess(true, await this.service.messages(q));
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Telegram messages by type (GROUP BY counter)' })
  async dashboard() {
    return buildSuccess(true, await this.service.dashboard());
  }
}
