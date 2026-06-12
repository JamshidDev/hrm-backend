import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StructureTreeController } from '@/modules/structure/structure-tree/structure-tree.controller';
import { StructureTreeService } from '@/modules/structure/structure-tree/structure-tree.service';

@Module({
  imports: [AuthModule],
  controllers: [StructureTreeController],
  providers: [StructureTreeService],
  exports: [StructureTreeService],
})
export class StructureTreeModule {}
