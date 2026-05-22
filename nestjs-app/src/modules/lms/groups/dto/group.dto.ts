// Groups DTO'lari. Laravel: GroupController + GroupWorkerController + LmsProtocolController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class GroupListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  edu_plan_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  group_id?: number;
}

export class GenerateGroupsDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  edu_plan_id!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  count_groups?: number;
}

export class DetachGroupWorkersDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  group_id!: number;

  @ApiProperty({ example: [10, 11, 12], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  worker_ids!: number[];
}
