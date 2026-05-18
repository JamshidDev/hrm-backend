import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StatementController } from '@/modules/economist/statements/statement.controller';
import { StatementService } from '@/modules/economist/statements/statement.service';

@Module({
  imports: [AuthModule],
  controllers: [StatementController],
  providers: [StatementService],
})
export class StatementModule {}
