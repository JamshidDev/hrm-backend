// Chat main controller — Laravel: ChatController.
// GET /api/v1/chat/enums — frontend dropdownlar uchun static enumlar.

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ChatMainService } from '@/modules/chat/main/main.service';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/chat')
export class ChatMainController {
  constructor(private readonly service: ChatMainService) {}

  @Get('enums')
  @ApiOperation({ summary: 'Chat module enums (telegram message types)' })
  enums() {
    return buildSuccess(true, this.service.enums());
  }
}
