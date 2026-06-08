// Groups DTO'lari. Laravel: GroupController + GroupWorkerController + LmsProtocolController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class GroupListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Laravel'da `per_page` cheklov yo'q — frontend katta limit (500, 1000) yuborishi mumkin.
  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  edu_plan_id?: number;

  // GET /lms/worker-exams — Laravel request('worker_id').
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  worker_id?: number;

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

  // Laravel: 'worker_position_ids' => 'required|array' (NOT worker_ids!)
  @ApiProperty({ example: [23014], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  worker_position_ids!: number[];
}
