import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PositionController } from '@/modules/structure/positions/position.controller';
import { PositionService } from '@/modules/structure/positions/position.service';

@Module({
  imports: [AuthModule],
  controllers: [PositionController],
  providers: [PositionService],
})
export class PositionModule {}
