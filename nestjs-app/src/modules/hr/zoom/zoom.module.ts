import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { HrZoomController } from '@/modules/hr/zoom/zoom.controller';
import { ZoomService } from '@/modules/hr/zoom/zoom.service';

@Module({
  imports: [AuthModule],
  controllers: [HrZoomController],
  providers: [ZoomService],
})
export class HrZoomModule {}
