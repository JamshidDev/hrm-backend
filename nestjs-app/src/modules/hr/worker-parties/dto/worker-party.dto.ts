// WorkerParty DTO'lari. Laravel: WorkerPartyController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerPartyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerPartyDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 2, description: 'PartyEnum 2..5' })
  @Type(() => Number) @IsInt() party!: number;

  @ApiProperty({ example: '2020-01-01' }) @IsDateString() from_date!: string;

  @ApiPropertyOptional({ example: '2024-01-01' }) @IsOptional() @IsDateString()
  to_date?: string;
}

export class UpdateWorkerPartyDto extends CreateWorkerPartyDto {}

// ---------- Response ----------

export class WorkerPartyItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: { id: 2, name: 'Xalq demokratik partiyasi' } })
  party!: { id: number; name: string };
  @ApiProperty() from_date!: string;
  @ApiProperty({ nullable: true }) to_date!: string | null;
}
