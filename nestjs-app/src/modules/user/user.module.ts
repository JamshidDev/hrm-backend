import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserController } from '@/modules/user/user.controller';
import { UserService } from '@/modules/user/user.service';
import { UserMobileModule } from '@/modules/user/mobile/mobile.module';
import { UserFaceModule } from '@/modules/user/face/face.module';
import { UserExtrasModule } from '@/modules/user/extras/extras.module';

@Module({
  imports: [AuthModule, UserMobileModule, UserFaceModule, UserExtrasModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
