import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { BusinessTripController } from '@/modules/hr/business-trips/business-trip.controller';
import { BusinessTripService } from '@/modules/hr/business-trips/business-trip.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [BusinessTripController],
  providers: [BusinessTripService],
})
export class BusinessTripModule {}
