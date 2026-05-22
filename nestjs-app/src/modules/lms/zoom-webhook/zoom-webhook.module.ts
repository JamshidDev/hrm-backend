import { Module } from '@nestjs/common';
import { LmsZoomWebhookController } from '@/modules/lms/zoom-webhook/zoom-webhook.controller';
import { LmsZoomWebhookService } from '@/modules/lms/zoom-webhook/zoom-webhook.service';

@Module({
  controllers: [LmsZoomWebhookController],
  providers: [LmsZoomWebhookService],
})
export class LmsZoomWebhookModule {}
