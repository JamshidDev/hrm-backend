import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { OrganizationServiceController } from '@/modules/structure/organization-services/organization-service.controller';
import { OrganizationServiceService } from '@/modules/structure/organization-services/organization-service.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationServiceController],
  providers: [OrganizationServiceService],
})
export class OrganizationServiceModule {}
