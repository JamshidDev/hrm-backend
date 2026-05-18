import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { EconomistEnumsController } from '@/modules/economist/enums-endpoint/enums.controller';
import { EconomistEnumsService } from '@/modules/economist/enums-endpoint/enums.service';

@Module({
  imports: [AuthModule],
  controllers: [EconomistEnumsController],
  providers: [EconomistEnumsService],
})
export class EconomistEnumsModule {}
