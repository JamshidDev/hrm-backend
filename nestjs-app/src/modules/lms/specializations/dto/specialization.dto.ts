// Specializations DTO'lari. Laravel: SpecializationStoreRequest.
// direction_id majburiy (FK directions.id).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SpecializationListQueryDto {
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

  @ApiPropertyOptional({ example: 'Backend' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  direction_id?: number;
}

export class UpsertSpecializationDto {
  @ApiProperty({ example: 'Backend Dasturchi' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Backend Разработчик' })
  @IsOptional()
  @IsString()
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Backend Developer' })
  @IsOptional()
  @IsString()
  name_en?: string;

  // Laravel: direction_id required.
  @ApiProperty({ example: 1, description: 'Direction (yo`nalish) id' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  direction_id!: number;

  // Laravel: $specialization->positions()->sync($request->positions).
  // Pivot table `specialization_positions` — IDs to attach (delete-then-insert).
  @ApiPropertyOptional({ example: [1, 2, 3], type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  positions?: number[];
}
