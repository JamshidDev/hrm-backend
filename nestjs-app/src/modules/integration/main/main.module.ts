import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StructureTreeModule } from '@/modules/structure/structure-tree/structure-tree.module';
import { IntegrationMainController } from '@/modules/integration/main/main.controller';
import { IntegrationMainService } from '@/modules/integration/main/main.service';

@Module({
  imports: [AuthModule, StructureTreeModule],
  controllers: [IntegrationMainController],
  providers: [IntegrationMainService],
})
export class IntegrationMainModule {}
