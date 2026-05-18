import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { HrEnumsController } from '@/modules/hr/enums-endpoint/enums.controller';
import { HrEnumsService } from '@/modules/hr/enums-endpoint/enums.service';

@Module({
  imports: [AuthModule],
  controllers: [HrEnumsController],
  providers: [HrEnumsService],
})
export class HrEnumsModule {}
