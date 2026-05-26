// Teachers DTO'lari. Laravel: TeacherStoreRequest.
// learning_center_id + worker_id ikkalasi majburiy.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class TeacherListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;

  @ApiPropertyOptional({ example: 'Akmal' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  learning_center_id?: number;
}

export class UpsertTeacherDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  learning_center_id!: number;

  @ApiProperty({ example: 42 })
  @Type(() => Number)
  @IsInt()
  worker_id!: number;

  // Laravel: `$teacher->subjects()->sync($syncData)` — pivot bilan learning_center_id ham.
  @ApiPropertyOptional({ example: [35, 34, 32], type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  subjects?: number[];
}
