import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsefulController } from '@/modules/useful/useful.controller';
import { UsefulService } from '@/modules/useful/useful.service';

@Module({
  imports: [AuthModule],
  controllers: [UsefulController],
  providers: [UsefulService],
})
export class UsefulModule {}
