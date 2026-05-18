import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { FilterController } from '@/modules/hr/filters/filter.controller';
import { FilterService } from '@/modules/hr/filters/filter.service';

@Module({
  imports: [AuthModule],
  controllers: [FilterController],
  providers: [FilterService],
})
export class FilterModule {}
