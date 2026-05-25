// DocumentFile DTO. Laravel: Confirmation/DocumentFileController (apiResource).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryDocumentFileDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() model_type?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  model_id?: number;
}

// GET /api/v1/document/files?model=&document_id=  — Laravel: index().
export class DocumentFileIndexQueryDto {
  @ApiProperty({ example: 'worker-application' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 569 })
  @Type(() => Number)
  @IsInt()
  document_id!: number;
}

// POST /api/v1/document/files — multipart/form-data.
// Laravel: DocumentFileController::store ($request->document_id, model, status, files[]).
export class CreateDocumentFileDto {
  @ApiProperty({ example: 569 })
  @Type(() => Number)
  @IsInt()
  document_id!: number;

  @ApiProperty({ example: 'worker-application' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiPropertyOptional({
    description: "'application' — fayl o'rniga worker_application bog'lash",
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description:
      "status=application bo'lganda — vergul bilan ajratilgan id lar",
  })
  @IsOptional()
  @IsString()
  worker_applications?: string;
}

export class UpdateDocumentFileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() original_name?: string;
}
