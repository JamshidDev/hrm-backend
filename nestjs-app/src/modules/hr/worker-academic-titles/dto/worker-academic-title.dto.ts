// WorkerAcademicTitle DTO'lari. Laravel: WorkerAcademicTitleController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerAcademicTitleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerAcademicTitleDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 1, description: 'AcademicTitleEnum 1..4' })
  @Type(() => Number) @IsInt() type!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

export class UpdateWorkerAcademicTitleDto extends CreateWorkerAcademicTitleDto {}

// ---------- Response ----------

export class WorkerAcademicTitleItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: { id: 1, name: 'Dotsent' } })
  type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) file!: string | null;
}
