// Holiday DTO'lari. Laravel: HolidayController + HolidayResource.
// scopeSearch: whereMonth(holiday_date, ?month=DD) — default current month.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryHolidayDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Month filter (1..12), default current month',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

// Laravel rules: name required, holiday_date required, type required.
export class CreateHolidayDto {
  @ApiProperty({ example: 'Mustaqillik kuni' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'День независимости' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Independence Day' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  @ApiProperty({ example: '2026-09-01', description: 'YYYY-MM-DD' })
  @IsDateString()
  holiday_date!: string;

  // HolidayTypeEnum: 1=ONE (public holiday), 2=TWO (weekend)
  @ApiProperty({ example: 1, description: '1=public holiday, 2=weekend' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  type!: number;
}

export class UpdateHolidayDto extends CreateHolidayDto {}

// ========== RESPONSE ==========

export class HolidayEnumItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Bayram kunlari' })
  name!: string;
}

export class HolidayItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Mustaqillik kuni', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '2026-09-01' })
  holiday_date!: string;

  @ApiProperty({ type: HolidayEnumItemDto })
  type!: HolidayEnumItemDto;
}

export class HolidayListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ type: [HolidayItemDto] })
  data!: HolidayItemDto[];
}
