import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TerminalController } from '@/modules/turnstile/terminals/terminal.controller';
import { TerminalService } from '@/modules/turnstile/terminals/terminal.service';

@Module({
  imports: [AuthModule],
  controllers: [TerminalController],
  providers: [TerminalService],
})
export class TerminalModule {}
