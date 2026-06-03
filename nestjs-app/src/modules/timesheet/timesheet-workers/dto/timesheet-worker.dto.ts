// TimeSheetWorker DTO'lari. Laravel: TimeSheetWorkerController.
//
// Endpoints:
//   - GET    /api/v1/timesheet/{id}/workers         — workers list per timesheet
//   - POST   /api/v1/timesheet/{id}/workers         — bulk upsert (status=true)
//                                                     or bulk forceDelete (status=false)
//   - GET    /api/v1/timesheet/{id}/day-in-month    — month days + holidays
//   - GET    /api/v1/timesheet/check-worker?pin=    — worker positions by PIN

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class CheckWorkerQueryDto {
  @ApiProperty({ example: '12345678901234' })
  @IsString()
  @Length(14, 14)
  pin!: string;
}

export class QueryTimeSheetWorkersDto extends SearchPaginationQueryDto {}

export class StoreTimeSheetWorkersDto {
  @ApiProperty({
    example: [{ id: 1, day: '2026-05-13' }],
    description: 'Worker positions + day to upsert',
  })
  @IsArray()
  workers!: Array<{ id: number; day: string }>;

  @ApiPropertyOptional({ example: 1, description: 'TimeSheetTypeEnum value' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hours?: number;
}

export class AcceptTimeSheetDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() status?: boolean;
}

// ---------- Response ----------

export class TimeSheetWorkerDayDetailDto {
  @ApiProperty() hours!: number;
  @ApiProperty({ nullable: true }) status!: string | null;
}

export class TimeSheetWorkerDayDto {
  @ApiProperty() day!: number;
  @ApiProperty({ type: [TimeSheetWorkerDayDetailDto] })
  details!: TimeSheetWorkerDayDetailDto[];
}

export class TimeSheetWorkerItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) table!: string | null;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) position!: string | null;
  @ApiProperty({ type: [TimeSheetWorkerDayDto] })
  days!: TimeSheetWorkerDayDto[];
}

export class TimeSheetWorkerListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [TimeSheetWorkerItemDto] })
  data!: TimeSheetWorkerItemDto[];
}

// dayInMonth
export class DayInMonthItemDto {
  @ApiProperty() day!: number;
  @ApiProperty() weekDay!: number;
  @ApiProperty() is_holiday!: boolean;
  @ApiProperty({ nullable: true }) comment!: string | null;
}

export class DayInMonthResponseDto {
  @ApiProperty({ nullable: true }) department!: string | null;
  @ApiProperty() month!: number;
  @ApiProperty() year!: number;
  @ApiProperty({ type: [DayInMonthItemDto] }) days!: DayInMonthItemDto[];
}

// checkWorker — WorkerPositionMinimalResource[]
export class CheckWorkerItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() worker!: unknown;
  @ApiProperty() organization!: unknown;
  @ApiProperty() post_name!: string;
  @ApiProperty() post_short_name!: string;
}
