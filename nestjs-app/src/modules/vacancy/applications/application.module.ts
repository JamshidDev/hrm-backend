import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ApplicationController } from '@/modules/vacancy/applications/application.controller';
import { ApplicationService } from '@/modules/vacancy/applications/application.service';

@Module({
  imports: [AuthModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
