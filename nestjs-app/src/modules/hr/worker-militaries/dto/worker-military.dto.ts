// WorkerMilitaryService DTO'lari. Laravel: WorkerMilitaryServiceController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerMilitaryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
}

export class CreateWorkerMilitaryDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() speciality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commissariat?: string;
  @ApiProperty({ example: 1, description: 'MilitaryStatusEnum 1..3' })
  @Type(() => Number) @IsInt() status!: number;
}

export class UpdateWorkerMilitaryDto extends CreateWorkerMilitaryDto {}

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
