import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { VacancyApproveController } from '@/modules/structure/vacancy-approve/vacancy-approve.controller';
import { VacancyApproveService } from '@/modules/structure/vacancy-approve/vacancy-approve.service';

@Module({
  imports: [AuthModule],
  controllers: [VacancyApproveController],
  providers: [VacancyApproveService],
})
export class VacancyApproveModule {}
