import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PensionerController } from '@/modules/hr/pensioners/pensioner.controller';
import { PensionerService } from '@/modules/hr/pensioners/pensioner.service';

@Module({
  imports: [AuthModule],
  controllers: [PensionerController],
  providers: [PensionerService],
})
export class PensionerModule {}
