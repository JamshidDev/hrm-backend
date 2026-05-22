// WorkerLanguage DTO'lari. Laravel: WorkerLanguageController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerLanguageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

// Laravel WorkerLanguageStoreRequest: { uuid, language_id, file? }
// `uuid` — worker UUID; resolved server-side to worker_id.
export class CreateWorkerLanguageDto {
  @ApiProperty({ example: 'bfba2d64-eb91-4699-82ef-0d3677810771' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @Exists('languages', 'id')
  language_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

// Update — no `uuid` (worker remains).
export class UpdateWorkerLanguageDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() @Exists('languages', 'id')
  language_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

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
