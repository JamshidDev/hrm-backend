import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsGroupController } from '@/modules/lms/groups/group.controller';
import { LmsGroupService } from '@/modules/lms/groups/group.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsGroupController],
  providers: [LmsGroupService],
})
export class LmsGroupModule {}
