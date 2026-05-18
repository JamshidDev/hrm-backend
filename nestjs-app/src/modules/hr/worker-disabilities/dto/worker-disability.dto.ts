// WorkerDisability DTO'lari. Laravel: WorkerDisabilityController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerDisabilityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerDisabilityDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt()
  level!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

export class UpdateWorkerDisabilityDto extends CreateWorkerDisabilityDto {}

// ---------- Response ----------

export class WorkerDisabilityItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() level!: number;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) from!: string | null;
  @ApiProperty({ nullable: true }) to!: string | null;
  @ApiProperty({ nullable: true }) comment!: string | null;
}
