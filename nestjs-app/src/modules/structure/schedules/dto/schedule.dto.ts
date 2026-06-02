// Schedule DTO'lari. Laravel: ScheduleController + ScheduleResource + WorkDayInfoResource.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryScheduleDto extends SearchPaginationQueryDto {}

export class CreateScheduleDto {
  @ApiProperty({ example: '5 kunlik' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '5-дневный' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name_ru?: string;

  @ApiPropertyOptional({ example: '5-day' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  // SchedulesEnum: 1=DAILY, 2=WEEKLY, 3=SHIFT
  @ApiProperty({ example: 1, description: '1=DAILY, 2=WEEKLY, 3=SHIFT' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  type!: number;
}

export class UpdateScheduleDto extends CreateScheduleDto {}

// ========== RESPONSE ==========

export class ScheduleEnumItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '5 kunlik' })
  name!: string;
}

// WorkDayInfoResource — Laravel: faqat work_days uchun minimal (schedule yo'q).
export class ScheduleWorkDayInfoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '09:00:00', nullable: true })
  start_time!: string | null;

  @ApiProperty({ example: '18:00:00', nullable: true })
  end_time!: string | null;

  @ApiProperty({ type: ScheduleEnumItemDto })
  type!: ScheduleEnumItemDto;

  @ApiProperty({ example: 1 })
  day_of_week!: number;
}

export class ScheduleItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '5 kunlik', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '5-дневный', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ type: ScheduleEnumItemDto })
  type!: ScheduleEnumItemDto;

  @ApiProperty({ type: [ScheduleWorkDayInfoDto] })
  work_days!: ScheduleWorkDayInfoDto[];
}

export class ScheduleListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 20 })
  total!: number;

  @ApiProperty({ type: [ScheduleItemDto] })
  data!: ScheduleItemDto[];
}
