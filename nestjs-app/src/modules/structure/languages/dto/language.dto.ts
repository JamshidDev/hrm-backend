// Language DTO'lari. Laravel: Modules/Structure/Http/Controllers/LanguageController + LanguageResource.

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

// ========== REQUEST ==========

export class QueryLanguageDto extends SearchPaginationQueryDto {}

export class CreateLanguageDto {
  @ApiProperty({ example: 'Ingliz tili' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'Английский' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name_ru!: string;

  @ApiProperty({ example: 'English' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name_en!: string;
}

export class UpdateLanguageDto extends CreateLanguageDto {}

// ========== RESPONSE ==========

export class LanguageItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ingliz tili' })
  name!: string;

  @ApiProperty({ example: 'Английский' })
  name_ru!: string;

  @ApiProperty({ example: 'English' })
  name_en!: string;
}

export class LanguageListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 20 })
  total!: number;

  @ApiProperty({ type: [LanguageItemDto] })
  data!: LanguageItemDto[];
}
