// WorkerPhoto DTO. Laravel: HR/WorkerPhotoController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerPhotoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  worker_id?: number;
}

export class CreateWorkerPhotoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ description: 'Base64-encoded image (data URI or raw)' })
  @IsString()
  @IsNotEmpty()
  photo!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  current?: boolean;
}

export class UpdateWorkerPhotoDto {
  @ApiPropertyOptional({ description: 'Base64-encoded image (data URI or raw)' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  current?: boolean;
}

// ---------- Response ----------

export class WorkerPhotoItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty() current!: boolean;
}
