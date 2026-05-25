// WorkerAcademicTitle DTO'lari. Laravel: WorkerAcademicTitleController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerAcademicTitleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

// Laravel WorkerAcademicTitleStoreRequest: { uuid, type, file? }
// `uuid` — worker UUID; resolved server-side to worker_id.
export class CreateWorkerAcademicTitleDto {
  @ApiProperty({ example: '63fc3e7a-9798-4250-9d92-2262165a1132' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 1, description: 'AcademicTitleEnum 1..4' })
  @Type(() => Number)
  @IsInt()
  type!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

// Update — no `uuid` (worker unchanged).
export class UpdateWorkerAcademicTitleDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() type!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

// ---------- Response ----------

export class WorkerAcademicTitleItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: { id: 1, name: 'Dotsent' } })
  type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) file!: string | null;
}
