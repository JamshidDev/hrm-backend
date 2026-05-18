// WorkerRelative DTO'lari. Laravel: WorkerRelativeController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerRelativeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateWorkerRelativeDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 1, description: 'RelativeEnum 1..15' })
  @Type(() => Number) @IsInt() relative!: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  relative_worker_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() last_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() first_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middle_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthday?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() birth_place?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() post_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() pin?: number;
}

export class UpdateWorkerRelativeDto extends CreateWorkerRelativeDto {}

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
