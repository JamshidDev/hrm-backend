// Position DTO'lari. Laravel: PositionController + PositionResource.
// Resource: { id, name, name_ru, classification_index, classification_code }.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryPositionDto extends SearchPaginationQueryDto {
  // Laravel: ?ids=1,2,3 — comma-separated.
  @ApiPropertyOptional({ example: '1,2,3' })
  @IsOptional()
  @IsString()
  ids?: string;
}

export class CreatePositionDto {
  @ApiProperty({ example: 'Dasturchi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Программист' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Programmer' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  @ApiPropertyOptional({ example: 1234 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classification_index?: number;

  @ApiPropertyOptional({ example: 5678 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classification_code?: number;
}

export class UpdatePositionDto extends CreatePositionDto {}

export class PositionItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Dasturchi' })
  name!: string;

  @ApiProperty({ example: 'Программист', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: 1234, nullable: true })
  classification_index!: number | null;

  @ApiProperty({ example: 5678, nullable: true })
  classification_code!: number | null;
}

export class PositionListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ type: [PositionItemDto] })
  data!: PositionItemDto[];
}
