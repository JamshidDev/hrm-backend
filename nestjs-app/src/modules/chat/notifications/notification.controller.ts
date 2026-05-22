// Notification controller. Laravel: NotificationController.
// Routes: /notifications + /notifications/enums + /notifications/send + /notifications/send-batch.

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ChatNotificationService } from '@/modules/chat/notifications/notification.service';
import {
  NotificationListQueryDto,
  SendBatchNotificationDto,
  SendNotificationDto,
} from '@/modules/chat/notifications/dto/notification.dto';

@ApiTags('Chat / Notifications')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/notifications')
export class ChatNotificationController {
  constructor(
    private readonly service: ChatNotificationService,
    private readonly i18n: I18nService,
  ) {}

  @Get('enums')
  @ApiOperation({ summary: 'Notification types' })
  enums() {
    return buildSuccess(true, this.service.enums());
  }

  @Get()
  @ApiOperation({ summary: 'List notifications (paginated)' })
  async list(@Query() q: NotificationListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post('send')
  @ApiOperation({ summary: 'Send notification to a single user' })
  async send(@Body() dto: SendNotificationDto) {
    return buildSuccess(
      this.i18n.t('messages.chat.notifications.send_success'),
      await this.service.send(dto),
    );
  }

  @Post('send-batch')
  @ApiOperation({ summary: 'Send notification to multiple users' })
  async sendBatch(@Body() dto: SendBatchNotificationDto) {
    return buildSuccess(
      this.i18n.t('messages.chat.notifications.send_success'),
      await this.service.sendBatch(dto),
    );
  }
}
