// Chat news translations DTO'lari.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const LOCALES = ['uz', 'ru', 'en'];

export class TranslationListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({
    description: "Faqat shu news_id uchun translation'lar",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chat_news_id?: number;
}

export class UpsertTranslationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chat_news_id!: number;

  @ApiProperty({ example: 'uz', enum: LOCALES })
  @IsString()
  @IsIn(LOCALES)
  locale!: string;

  @ApiPropertyOptional({ example: 'Sarlavha' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Qisqacha matn' })
  @IsOptional()
  @IsString()
  short_description?: string;

  @ApiPropertyOptional({ example: 'Toliq matn' })
  @IsOptional()
  @IsString()
  content?: string;
}
