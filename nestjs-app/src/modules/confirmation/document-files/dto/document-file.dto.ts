// DocumentFile DTO. Laravel: Confirmation/DocumentFileController (apiResource).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryDocumentFileDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() model_type?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() model_id?: number;
}

export class CreateDocumentFileDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiProperty({ description: 'Base64 file' })
  @IsString()
  @IsNotEmpty()
  file!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() original_name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() worker_application_id?: number;
}

export class UpdateDocumentFileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() original_name?: string;
}
