import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsDirectionController } from '@/modules/lms/directions/direction.controller';
import { LmsDirectionService } from '@/modules/lms/directions/direction.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsDirectionController],
  providers: [LmsDirectionService],
})
export class LmsDirectionModule {}
