import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  OrganizationPhoneController,
  OrganizationPhoneListController,
} from '@/modules/hr/organization-phones/organization-phone.controller';
import { OrganizationPhoneService } from '@/modules/hr/organization-phones/organization-phone.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationPhoneController, OrganizationPhoneListController],
  providers: [OrganizationPhoneService],
})
export class OrganizationPhoneModule {}
