import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { EnumsExtrasController } from '@/modules/hr/enums-extras/enums-extras.controller';
import { EnumsExtrasService } from '@/modules/hr/enums-extras/enums-extras.service';

@Module({
  imports: [AuthModule],
  controllers: [EnumsExtrasController],
  providers: [EnumsExtrasService],
})
export class EnumsExtrasModule {}
