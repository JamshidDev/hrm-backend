import { Global, Module } from '@nestjs/common';
import { ZoomService } from '@/shared/zoom/zoom.service';

@Global()
@Module({
  providers: [ZoomService],
  exports: [ZoomService],
})
export class ZoomModule {}
