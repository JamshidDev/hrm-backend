// WorkerRelative DTO'lari. Laravel: WorkerRelativeController.

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

export class QueryWorkerRelativeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

// Laravel WorkerRelativeStoreRequest:
//   uuid (required) — worker UUID (whose relative this is)
//   worker_id (nullable) — RELATIVE worker's id (if relative is also a worker)
//   relative (int) — RelativeEnum 1..15
//   last_name/first_name/middle_name/birthday/birth_place/post_name/address — optional
//   sort, pin — optional
// Naming convention:
//   request field `worker_id` → db column `relative_worker_id`
//   resolved from `uuid`     → db column `worker_id`
export class CreateWorkerRelativeDto {
  @ApiProperty({ example: '63fc3e7a-9798-4250-9d92-2262165a1132' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 1, description: 'RelativeEnum 1..15' })
  @Type(() => Number)
  @IsInt()
  relative!: number;

  // Laravel field name: `worker_id` (the RELATIVE worker, nullable).
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  last_name?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  first_name?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  middle_name?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  birthday?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  birth_place?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  post_name?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() address?:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pin?: number | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  marital_status?: number | null;
}

// Update — no `uuid` (worker unchanged).
export class UpdateWorkerRelativeDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  relative!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  last_name?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  first_name?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  middle_name?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  birthday?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  birth_place?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  post_name?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() address?:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pin?: number | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  marital_status?: number | null;
}

export class SortableWorkerRelativeDto {
  @ApiPropertyOptional({ example: [{ id: 1, sort: 1 }] })
  @IsOptional()
  orders?: Array<{ id: number; sort: number }>;
}

// ---------- Response ----------

export class WorkerRelativeWorkerMinDto {
  @ApiProperty() id!: number;
  @ApiProperty() uuid!: string;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
  @ApiProperty() birthday!: string;
  @ApiProperty({ nullable: true }) pin!: number | null;
}

export class WorkerRelativeDisabilityDto {
  @ApiProperty() id!: number;
  @ApiProperty() level!: number;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) from!: string | null;
  @ApiProperty({ nullable: true }) to!: string | null;
  @ApiProperty({ nullable: true }) comment!: string | null;
}

export class WorkerRelativeItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ example: { id: 1, name: 'Otasi' } })
  relative!: { id: number; name: string };
  @ApiProperty({ type: WorkerRelativeWorkerMinDto, nullable: true })
  relative_worker!: WorkerRelativeWorkerMinDto | null;
  @ApiProperty({ nullable: true }) birthday!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
  @ApiProperty({ nullable: true }) birth_place!: string | null;
  @ApiProperty({ nullable: true }) post_name!: string | null;
  @ApiProperty({ nullable: true }) address!: string | null;
  @ApiProperty({ type: [WorkerRelativeDisabilityDto] })
  disabilities!: WorkerRelativeDisabilityDto[];
}
