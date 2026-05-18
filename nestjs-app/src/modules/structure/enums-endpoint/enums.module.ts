import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { EnumsController } from '@/modules/structure/enums-endpoint/enums.controller';
import { EnumsService } from '@/modules/structure/enums-endpoint/enums.service';

@Module({
  imports: [AuthModule],
  controllers: [EnumsController],
  providers: [EnumsService],
})
export class EnumsModule {}
