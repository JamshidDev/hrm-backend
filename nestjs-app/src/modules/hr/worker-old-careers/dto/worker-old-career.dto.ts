// WorkerOldCareer DTO'lari. Laravel: WorkerOldCareerController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerOldCareerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerOldCareerDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() from_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() post_name?: string;
}

export class UpdateWorkerOldCareerDto extends CreateWorkerOldCareerDto {}

// ---------- Response ----------

export class WorkerOldCareerItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() sort!: number;
  @ApiProperty({ nullable: true }) from_date!: string | null;
  @ApiProperty({ nullable: true }) to_date!: string | null;
  @ApiProperty({ nullable: true }) post_name!: string | null;
}
