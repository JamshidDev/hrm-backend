import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ConvertModule } from '@/shared/convert/convert.module';
import { LmsCertificateController } from '@/modules/lms/certificates/certificate.controller';
import { LmsCertificateService } from '@/modules/lms/certificates/certificate.service';

@Module({
  imports: [AuthModule, ConvertModule],
  controllers: [LmsCertificateController],
  providers: [LmsCertificateService],
})
export class LmsCertificateModule {}
