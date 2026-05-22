import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { InstructionController } from '@/modules/admin/instructions/instruction.controller';
import { InstructionService } from '@/modules/admin/instructions/instruction.service';

@Module({
  imports: [AuthModule],
  controllers: [InstructionController],
  providers: [InstructionService],
})
export class InstructionModule {}
