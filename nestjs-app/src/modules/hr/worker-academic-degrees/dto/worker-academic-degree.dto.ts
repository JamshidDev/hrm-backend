// WorkerAcademicDegree DTO'lari. Laravel: WorkerAcademicDegreeController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerAcademicDegreeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

// Laravel WorkerAcademicDegreeStoreRequest: { uuid, type, file? }
// `uuid` — worker UUID; resolved server-side to worker_id.
export class CreateWorkerAcademicDegreeDto {
  @ApiProperty({ example: '63fc3e7a-9798-4250-9d92-2262165a1132' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 1, description: 'AcademicDegreeEnum 1..4' })
  @Type(() => Number) @IsInt() type!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

// Update — no `uuid` (worker unchanged).
export class UpdateWorkerAcademicDegreeDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() type!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

// ---------- Response ----------

export class WorkerAcademicDegreeItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: { id: 1, name: 'Fan doktori' } })
  type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) file!: string | null;
}
