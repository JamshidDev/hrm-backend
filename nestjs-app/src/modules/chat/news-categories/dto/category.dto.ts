// Chat news categories DTO'lari. Laravel: ChatNewsCategoryStoreRequest.
// `name` jadval ustuni `jsonb` — 3 til uchun {uz, ru, en}.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// Laravel ChatNewsCategoryStoreRequest — name.uz required, name.ru/en nullable.
export class CategoryNameDto {
  @ApiProperty({ example: 'Yangiliklar' })
  @IsString()
  uz!: string;

  @ApiPropertyOptional({ example: 'Новости' })
  @IsOptional()
  @IsString()
  ru?: string;

  @ApiPropertyOptional({ example: 'News' })
  @IsOptional()
  @IsString()
  en?: string;
}

export class CategoryListQueryDto {
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
}

/**
 * POST/PUT body — Laravel ChatNewsCategoryStoreRequest: { name: { uz, ru?, en? } }.
 * `name` jsonb sifatida obyekt ko'rinishida saqlanadi.
 */
export class UpsertCategoryDto {
  @ApiProperty({ type: CategoryNameDto })
  @ValidateNested()
  @Type(() => CategoryNameDto)
  name!: CategoryNameDto;
}
