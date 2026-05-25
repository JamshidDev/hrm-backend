// WorkerApplication DTO. Laravel: HR/WorkerApplicationController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerApplicationDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() organizations?: string;
}

// PUT /applications/{id}/accept
export class AcceptWorkerApplicationDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  status!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

// POST /applications/generate-url
export class GenerateApplicationUrlDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('worker_positions', 'id')
  worker_position_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  type!: number;
}
