import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  ContractTypeController,
  ContractAdditionalTypeController,
  CommandTypeController,
} from '@/modules/structure/document-types/document-types.controllers';
import { DocumentTypeService } from '@/modules/structure/document-types/document-type.service';

@Module({
  imports: [AuthModule],
  controllers: [
    ContractTypeController,
    ContractAdditionalTypeController,
    CommandTypeController,
  ],
  providers: [DocumentTypeService],
})
export class DocumentTypesModule {}
