import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { DeployController } from '@/modules/admin/deploy/deploy.controller';
import { DeployService } from '@/modules/admin/deploy/deploy.service';

@Module({
  imports: [AuthModule],
  controllers: [DeployController],
  providers: [DeployService],
})
export class DeployModule {}
