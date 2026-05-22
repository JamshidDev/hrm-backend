import { Module } from '@nestjs/common';
import { IntegrationMobileFaceController } from '@/modules/integration/mobile-face/mobile-face.controller';
import { IntegrationMobileFaceService } from '@/modules/integration/mobile-face/mobile-face.service';

@Module({
  controllers: [IntegrationMobileFaceController],
  providers: [IntegrationMobileFaceService],
})
export class IntegrationMobileFaceModule {}
