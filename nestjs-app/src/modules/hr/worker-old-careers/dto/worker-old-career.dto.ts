// WorkerOldCareer DTO'lari. Laravel: WorkerOldCareerController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerOldCareerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

// Laravel WorkerOldCareerStoreRequest: { uuid, from_date, to_date, post_name, sort? }
// `uuid` — worker UUID; resolved server-side to worker_id.
export class CreateWorkerOldCareerDto {
  @ApiProperty({ example: '63fc3e7a-9798-4250-9d92-2262165a1132' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty() @IsDateString() from_date!: string;
  @ApiProperty() @IsDateString() to_date!: string;
  @ApiProperty() @IsString() post_name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;
}

// Update — no `uuid` (worker unchanged).
export class UpdateWorkerOldCareerDto {
  @ApiProperty() @IsDateString() from_date!: string;
  @ApiProperty() @IsDateString() to_date!: string;
  @ApiProperty() @IsString() post_name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;
}

// ---------- Response ----------

export class WorkerOldCareerItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() sort!: number;
  @ApiProperty({ nullable: true }) from_date!: string | null;
  @ApiProperty({ nullable: true }) to_date!: string | null;
  @ApiProperty({ nullable: true }) post_name!: string | null;
}
