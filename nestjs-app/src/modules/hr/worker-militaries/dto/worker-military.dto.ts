// WorkerMilitaryService DTO'lari. Laravel: WorkerMilitaryServiceController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerMilitaryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

// Laravel WorkerMilitaryStoreRequest: { uuid, status, name?, number?, speciality?, commissariat? }
// `uuid` — worker UUID; resolved server-side to worker_id.
export class CreateWorkerMilitaryDto {
  @ApiProperty({ example: '63fc3e7a-9798-4250-9d92-2262165a1132' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 1, description: 'MilitaryStatusEnum 1..3' })
  @Type(() => Number) @IsInt() status!: number;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() name?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() number?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() speciality?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() commissariat?: string | null;
}

// Update — no `uuid` (worker unchanged).
export class UpdateWorkerMilitaryDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() status!: number;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() name?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() number?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() speciality?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() commissariat?: string | null;
}

// ---------- Response ----------

export class WorkerMilitaryItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) speciality!: string | null;
  @ApiProperty({ example: { id: 1, name: 'Yaroqli' } })
  status!: { id: number; name: string };
  @ApiProperty({ nullable: true }) commissariat!: string | null;
}
