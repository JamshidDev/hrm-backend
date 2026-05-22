// Chat news categories DTO'lari. Laravel: ChatNewsCategoryStoreRequest.
// `name` jadval ustuni `jsonb` — 3 til uchun {uz, ru, en}.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
 * POST/PUT body. Laravel: { name: { uz, ru?, en? } } ham, flat ham.
 * Frontend ikkala variantni yuborishi mumkin — biz quyidagicha qabul qilamiz:
 *   - `name` (uz uchun majburiy)
 *   - `name_ru`, `name_en` (ixtiyoriy, default `name`)
 */
export class UpsertCategoryDto {
  @ApiProperty({ example: 'Yangiliklar' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Новости' })
  @IsOptional()
  @IsString()
  name_ru?: string;

  @ApiPropertyOptional({ example: 'News' })
  @IsOptional()
  @IsString()
  name_en?: string;
}
