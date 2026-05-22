import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AiController } from '@/modules/ai/ai.controller';
import { AiService } from '@/modules/ai/ai.service';

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
