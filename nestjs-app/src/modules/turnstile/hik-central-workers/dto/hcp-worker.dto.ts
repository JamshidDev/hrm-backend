// HCP Worker DTOs. Laravel: HikCentralWorkerController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryHcpWorkerDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() worker_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() job_id?: number;

  // /turnstile/hik-central/workers — Laravel filter'lari.
  @ApiPropertyOptional({ description: 'Access level id' })
  @IsOptional() @IsInt() access_level_id?: number;
  @ApiPropertyOptional({ description: 'Worker access level status (1=ok)' })
  @IsOptional() @IsInt() status?: number;
  @ApiPropertyOptional({ description: "'yes' (added) | 'no' (not added)" })
  @IsOptional() @IsString() added?: string;
  @ApiPropertyOptional({ description: 'organizations CSV: 151,154', example: '151' })
  @IsOptional() @IsString() organizations?: string;
  @ApiPropertyOptional({ description: 'departments CSV: 11,22' })
  @IsOptional() @IsString() departments?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() organization_id?: number;
}

export class AddHcpWorkerDto {
  @ApiProperty() @IsInt() worker_id!: number;
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  access_level_ids!: number[];
  @ApiPropertyOptional({ description: 'WorkerPhoto.id (existing)' })
  @IsOptional() @IsInt() photo_id?: number;
  @ApiPropertyOptional({ description: 'base64 data URL or raw' })
  @IsOptional() @IsString() photo?: string;
  @ApiPropertyOptional({ description: 'end_time (Y-m-d or ISO)' })
  @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() end_time?: string;
}

export class SyncWorkersToHcpDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsInt() organization_id!: number;
  @ApiProperty() @IsInt() access_level_id!: number;
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  departments?: number[];
}
