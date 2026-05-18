import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { VacationController } from '@/modules/hr/vacations/vacation.controller';
import { VacationService } from '@/modules/hr/vacations/vacation.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [VacationController],
  providers: [VacationService],
})
export class VacationModule {}
