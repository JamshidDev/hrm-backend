// Quote DTO'lari. Laravel: app/Http/Controllers/QuoteController + QuoteResource.
// text + author — JSON columns: {uz, ru, en}.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryQuoteDto extends PaginationQueryDto {}

// Laravel rules: text.uz, text.ru, text.en, author.uz, author.ru, author.en — required strings.
export class QuoteTranslationDto {
  @ApiProperty({ example: "Mustaqillik kuni" })
  @IsString()
  @IsNotEmpty()
  uz!: string;

  @ApiProperty({ example: 'День независимости' })
  @IsString()
  @IsNotEmpty()
  ru!: string;

  @ApiProperty({ example: 'Independence Day' })
  @IsString()
  @IsNotEmpty()
  en!: string;
}

export class CreateQuoteDto {
  @ApiProperty({ type: QuoteTranslationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => QuoteTranslationDto)
  text!: QuoteTranslationDto;

  @ApiProperty({ type: QuoteTranslationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => QuoteTranslationDto)
  author!: QuoteTranslationDto;
}

// Update — Laravel rules `sometimes|string` — har field optional.
// Lekin nested structure'da partial qiyin. Pragmatik: CreateDto bilan bir xil — full payload.
export class UpdateQuoteDto extends CreateQuoteDto {}

// ========== RESPONSE ==========

export class QuoteItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: QuoteTranslationDto })
  author!: QuoteTranslationDto;

  @ApiProperty({ type: QuoteTranslationDto })
  text!: QuoteTranslationDto;
}

export class QuoteListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [QuoteItemDto] })
  data!: QuoteItemDto[];
}
