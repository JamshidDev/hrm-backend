// WorkerDisability DTO'lari. Laravel: WorkerDisabilityController.

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

export class QueryWorkerDisabilityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

// Laravel WorkerDisabilityStoreRequest: { uuid, level, number, from?, to?, comment? }
// where `uuid` is the WORKER uuid (not the disability id).
export class CreateWorkerDisabilityDto {
  @ApiProperty({ example: 'bfba2d64-eb91-4699-82ef-0d3677810771' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt()
  level!: number;

  @ApiProperty() @IsString() number!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsDateString() to?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

// Update: no `uuid` (worker is taken from existing row).
export class UpdateWorkerDisabilityDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt()
  level!: number;

  @ApiProperty() @IsString() number!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsDateString() to?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

// ---------- Response ----------

export class WorkerDisabilityItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() level!: number;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) from!: string | null;
  @ApiProperty({ nullable: true }) to!: string | null;
  @ApiProperty({ nullable: true }) comment!: string | null;
}
