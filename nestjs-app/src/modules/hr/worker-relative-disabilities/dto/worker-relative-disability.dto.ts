// WorkerRelativeDisability DTO. Laravel: WorkerRelativeDisabilityController.
// WorkerDisabilityResource bilan bir xil shape — id/level/number/from/to/comment.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerRelativeDisabilityDto {
  @ApiPropertyOptional({ description: 'Filter by worker_relative_id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  worker_relative_id?: number;
}

export class CreateWorkerRelativeDisabilityDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('worker_relatives', 'id')
  worker_relative_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  level!: number;

  @ApiProperty({ example: '123/45' })
  @IsString()
  number!: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

export class UpdateWorkerRelativeDisabilityDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  level!: number;

  @ApiProperty({ example: '123/45' })
  @IsString()
  number!: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

// ---------- Response ----------

export class WorkerRelativeDisabilityItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() level!: number;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) from!: string | null;
  @ApiProperty({ nullable: true }) to!: string | null;
  @ApiProperty({ nullable: true }) comment!: string | null;
}
