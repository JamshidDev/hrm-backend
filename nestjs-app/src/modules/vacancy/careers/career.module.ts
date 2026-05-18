import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { CareerController } from '@/modules/vacancy/careers/career.controller';
import { CareerService } from '@/modules/vacancy/careers/career.service';

@Module({
  imports: [AuthModule],
  controllers: [CareerController],
  providers: [CareerService],
})
export class CareerModule {}
