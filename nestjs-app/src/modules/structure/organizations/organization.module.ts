import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  OrganizationController,
  OrganizationExtraController,
} from '@/modules/structure/organizations/organization.controller';
import { OrganizationService } from '@/modules/structure/organizations/organization.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationController, OrganizationExtraController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
