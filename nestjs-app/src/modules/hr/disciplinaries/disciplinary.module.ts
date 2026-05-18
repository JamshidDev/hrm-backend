import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { DisciplinaryController } from '@/modules/hr/disciplinaries/disciplinary.controller';
import { DisciplinaryService } from '@/modules/hr/disciplinaries/disciplinary.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [DisciplinaryController],
  providers: [DisciplinaryService],
})
export class DisciplinaryModule {}
