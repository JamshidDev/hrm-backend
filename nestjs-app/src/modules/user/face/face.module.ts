import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserFaceController } from '@/modules/user/face/face.controller';
import { UserFaceService } from '@/modules/user/face/face.service';

@Module({
  imports: [AuthModule],
  controllers: [UserFaceController],
  providers: [UserFaceService],
})
export class UserFaceModule {}
