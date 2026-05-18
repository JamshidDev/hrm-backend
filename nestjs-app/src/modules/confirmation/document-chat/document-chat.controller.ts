// Document chat controller. Laravel: Confirmation/DocumentChatController.

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
import { DocumentChatService } from '@/modules/confirmation/document-chat/document-chat.service';
import {
  ChatMessagesQueryDto,
  ChatQueryDto,
  ReadMessageDto,
  SendMessageDto,
} from '@/modules/confirmation/document-chat/dto/document-chat.dto';

@ApiTags('Confirmation / Document Chat')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/document')
export class DocumentChatController {
  constructor(
    private readonly service: DocumentChatService,
    private readonly i18n: I18nService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'Chat participants for document' })
  async users(@Query() query: ChatQueryDto) {
    return buildSuccess(true, await this.service.users(query));
  }

  @Get('messages')
  @ApiOperation({ summary: 'Chat messages between current user and recipient' })
  async messages(@Query() query: ChatMessagesQueryDto) {
    return buildSuccess(true, await this.service.messages(query));
  }

  @Post('messages')
  async sendMessage(@Body() dto: SendMessageDto) {
    await this.service.sendMessage(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id', ParseIntPipe) id: number) {
    await this.service.deleteMessage(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post('messages/read')
  async readMessages(@Body() dto: ReadMessageDto) {
    await this.service.readMessages(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
