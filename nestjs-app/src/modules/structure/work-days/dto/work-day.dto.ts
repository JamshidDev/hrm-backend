// WorkDay DTO'lari. Laravel: WorkDayController + WorkDayResource.
//   - schedule (full ScheduleResource bilan) eager load
//   - start_time, end_time (HH:MM:SS)
//   - day_of_week (1..7)
//   - type ({id, name from WorkDayTypeEnum})

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';
import { ScheduleItemDto } from '@/modules/structure/schedules/dto/schedule.dto';

export class QueryWorkDayDto extends PaginationQueryDto {
  // Laravel scopeFilter — schedule_id.
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  schedule_id?: number;

  // Laravel scopeSearch — start_time / end_time. Hozircha optional string.
  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  end_time?: string;
}

// Laravel rules:
//   schedule_id: required|exists:schedules,id
//   start_time:  required|date_format:H:i
//   end_time:    required|date_format:H:i
//   day_of_week: required|in:1,2,3,4,5,6,7
//   type:        required
export class CreateWorkDayDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('schedules', 'id')
  schedule_id!: number;

  @ApiProperty({ example: '09:00', description: 'HH:MM (24-hour)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start_time must be HH:MM' })
  start_time!: string;

  @ApiProperty({ example: '18:00', description: 'HH:MM (24-hour)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end_time must be HH:MM' })
  end_time!: string;

  @ApiProperty({ example: 1, description: '1=Monday .. 7=Sunday' })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3, 4, 5, 6, 7])
  day_of_week!: number;

  @ApiProperty({ example: 1, description: '1=D (day), 2=N (night)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  type!: number;
}

export class UpdateWorkDayDto extends CreateWorkDayDto {}

// ========== RESPONSE ==========

export class WorkDayEnumItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Kunduzgi' })
  name!: string;
}

export class WorkDayItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: ScheduleItemDto, nullable: true })
  schedule!: ScheduleItemDto | null;

  @ApiProperty({ example: '09:00:00', nullable: true })
  start_time!: string | null;

  @ApiProperty({ example: '18:00:00', nullable: true })
  end_time!: string | null;

  @ApiProperty({ type: WorkDayEnumItemDto })
  type!: WorkDayEnumItemDto;

  @ApiProperty({ example: 1 })
  day_of_week!: number;
}

export class WorkDayListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ type: [WorkDayItemDto] })
  data!: WorkDayItemDto[];
}
