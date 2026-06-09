// Station workers query DTO. Laravel StationIndexRequest: per_page max 200, search.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StationWorkersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Laravel: per_page nullable|integer|max:200.
  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  per_page?: number;

  @ApiPropertyOptional({ description: 'Worker fullname search' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '151,154' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 222 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}
