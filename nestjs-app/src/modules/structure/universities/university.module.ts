import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UniversityController } from '@/modules/structure/universities/university.controller';
import { UniversityService } from '@/modules/structure/universities/university.service';

@Module({
  imports: [AuthModule],
  controllers: [UniversityController],
  providers: [UniversityService],
})
export class UniversityModule {}
