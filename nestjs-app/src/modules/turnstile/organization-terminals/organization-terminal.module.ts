import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { OrganizationTerminalController } from '@/modules/turnstile/organization-terminals/organization-terminal.controller';
import { OrganizationTerminalService } from '@/modules/turnstile/organization-terminals/organization-terminal.service';

@Module({
  imports: [AuthModule],
  controllers: [OrganizationTerminalController],
  providers: [OrganizationTerminalService],
})
export class OrganizationTerminalModule {}
