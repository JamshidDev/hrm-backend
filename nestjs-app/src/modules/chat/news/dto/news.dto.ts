// Chat news DTO'lari. Laravel: ChatNewsStoreRequest + ChatNewsIndexRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Status: 1=Draft, 2=Published. */
const NEWS_STATUSES = [1, 2];

export class NewsListQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({
    enum: NEWS_STATUSES,
    description: '1=Draft, 2=Published',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(NEWS_STATUSES)
  status?: number;
}

/** Nested translation — chat_news_translations'ga yoziladi. */
export class NewsTranslationInputDto {
  @ApiProperty({ example: 'uz', enum: ['uz', 'ru', 'en'] })
  @IsString()
  locale!: string;

  @ApiPropertyOptional({ example: 'Yangilik sarlavhasi' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Qisqacha tavsif' })
  @IsOptional()
  @IsString()
  short_description?: string;

  @ApiPropertyOptional({ example: 'Toliq matn HTML bilan' })
  @IsOptional()
  @IsString()
  content?: string;
}

export class CreateNewsDto {
  @ApiPropertyOptional({ example: 'yangilik-slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ enum: NEWS_STATUSES, example: 2 })
  @Type(() => Number)
  @IsInt()
  @IsIn(NEWS_STATUSES)
  status!: number;

  @ApiPropertyOptional({ example: '2025-10-15T12:00:00Z' })
  @IsOptional()
  @IsDateString()
  published_at?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @ApiPropertyOptional({ type: [NewsTranslationInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewsTranslationInputDto)
  translations?: NewsTranslationInputDto[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Kategoriya ID`lari (chat_categories_news pivot uchun)',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  categories?: number[];
}

export class UpdateNewsDto extends CreateNewsDto {
  // Update'da hamma field'lar ixtiyoriy
  @ApiPropertyOptional({ enum: NEWS_STATUSES })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(NEWS_STATUSES)
  declare status: number;
}

/** GET /news?per_page= — public list (auth-hybrid). */
export class PublicNewsListQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  per_page?: number;
}
