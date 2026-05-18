// WorkerLanguage DTO'lari. Laravel: WorkerLanguageController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerLanguageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerLanguageDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @Exists('languages', 'id')
  language_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

export class UpdateWorkerLanguageDto extends CreateWorkerLanguageDto {}

// ---------- Response ----------

export class WorkerLanguageEmbeddedDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) name_ru!: string | null;
  @ApiProperty({ nullable: true }) name_en!: string | null;
  @ApiProperty({ nullable: true }) created_at!: string | null;
  @ApiProperty({ nullable: true }) updated_at!: string | null;
  @ApiProperty({ nullable: true }) deleted_at!: string | null;
}

export class WorkerLanguageItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: WorkerLanguageEmbeddedDto, nullable: true })
  language!: WorkerLanguageEmbeddedDto | null;
  @ApiProperty({ nullable: true }) file!: string | null;
}
