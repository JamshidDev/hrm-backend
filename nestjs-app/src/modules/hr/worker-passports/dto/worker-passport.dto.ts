// WorkerPassport DTO'lari. Laravel: WorkerPassportController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerPassportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerPassportDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty() @IsString() serial_number!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() current?: boolean;
}

export class UpdateWorkerPassportDto extends CreateWorkerPassportDto {}

// ---------- Response ----------

export class WorkerPassportItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) serial_number!: string | null;
  @ApiProperty({ nullable: true }) from_date!: string | null;
  @ApiProperty({ nullable: true }) to_date!: string | null;
  @ApiProperty({ nullable: true }) address!: string | null;
  @ApiProperty({ example: 'https://...', nullable: true }) file!: string | null;
}
