// Specializations DTO'lari. Laravel: SpecializationStoreRequest.
// direction_id majburiy (FK directions.id).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SpecializationListQueryDto {
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

  @ApiProperty({ example: 1, description: 'Direction (yo`nalish) id' })
  @Type(() => Number)
  @IsInt()
  direction_id!: number;
}
