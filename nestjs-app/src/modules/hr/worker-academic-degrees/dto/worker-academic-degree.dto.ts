// WorkerAcademicDegree DTO'lari. Laravel: WorkerAcademicDegreeController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerAcademicDegreeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerAcademicDegreeDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 1, description: 'AcademicDegreeEnum 1..4' })
  @Type(() => Number) @IsInt() type!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

export class UpdateWorkerAcademicDegreeDto extends CreateWorkerAcademicDegreeDto {}

// ---------- Response ----------

export class WorkerAcademicDegreeItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: { id: 1, name: 'Fan doktori' } })
  type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) file!: string | null;
}
