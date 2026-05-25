// WorkerSickLeave DTO'lari. Laravel: WorkerSickLeaveController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerSickLeaveDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerSickLeaveDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  worker_position_id!: number;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  from_date!: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  sick?: unknown;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;
}

export class UpdateWorkerSickLeaveDto extends CreateWorkerSickLeaveDto {}

// ---------- Response ----------

export class WorkerSickLeaveItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() worker_position_id!: number;
  @ApiProperty() from_date!: string;
  @ApiProperty({ nullable: true }) to_date!: string | null;
  @ApiProperty({ nullable: true }) sick!: unknown;
  @ApiProperty() type!: number;
}
