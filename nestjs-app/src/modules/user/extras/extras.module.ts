import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserExtrasController } from '@/modules/user/extras/extras.controller';
import { UserExtrasService } from '@/modules/user/extras/extras.service';

@Module({
  imports: [AuthModule],
  controllers: [UserExtrasController],
  providers: [UserExtrasService],
})
export class UserExtrasModule {}
