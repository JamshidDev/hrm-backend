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
}

export class AddHcpWorkerDto {
  @ApiProperty() @IsInt() worker_id!: number;
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
