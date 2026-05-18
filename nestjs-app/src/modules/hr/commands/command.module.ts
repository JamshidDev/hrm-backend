import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  CommandController,
  WorkerAdditionalController,
} from '@/modules/hr/commands/command.controller';
import { CommandService } from '@/modules/hr/commands/command.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [CommandController, WorkerAdditionalController],
  providers: [CommandService],
})
export class CommandModule {}
