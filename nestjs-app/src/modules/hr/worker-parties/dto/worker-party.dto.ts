// WorkerParty DTO'lari. Laravel: WorkerPartyController.

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

export class QueryWorkerPartyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

// Laravel WorkerPartyStoreRequest: { uuid, party, from_date }
// `uuid` — worker UUID; resolved server-side to worker_id.
export class CreateWorkerPartyDto {
  @ApiProperty({ example: '63fc3e7a-9798-4250-9d92-2262165a1132' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 2, description: 'PartyEnum 2..5' })
  @Type(() => Number)
  @IsInt()
  party!: number;

  @ApiProperty({ example: '2020-01-01' }) @IsDateString() from_date!: string;

  @ApiPropertyOptional({ example: '2024-01-01', nullable: true })
  @IsOptional()
  @IsDateString()
  to_date?: string | null;
}

// Update — no `uuid` (worker unchanged).
export class UpdateWorkerPartyDto {
  @ApiProperty({ example: 2 }) @Type(() => Number) @IsInt() party!: number;
  @ApiProperty({ example: '2020-01-01' }) @IsDateString() from_date!: string;
  @ApiPropertyOptional({ example: '2024-01-01', nullable: true })
  @IsOptional()
  @IsDateString()
  to_date?: string | null;
}

// ---------- Response ----------

export class WorkerPartyItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: { id: 2, name: 'Xalq demokratik partiyasi' } })
  party!: { id: number; name: string };
  @ApiProperty() from_date!: string;
  @ApiProperty({ nullable: true }) to_date!: string | null;
}
