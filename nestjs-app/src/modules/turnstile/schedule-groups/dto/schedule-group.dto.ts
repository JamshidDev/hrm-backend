// Schedule group DTOs. Laravel: TurnstileScheduleGroupController.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class QueryScheduleGroupDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizations?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() schedule_type?: number;
}

export class QueryScheduleGroupWorkersDto extends QueryScheduleGroupDto {
  // Laravel uses `group` query param (TurnstileScheduleGroupWorkersRequest).
  @ApiPropertyOptional() @IsOptional() @IsInt() group?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() month?: number;
  // Backward compat (some clients send group_id).
  @ApiPropertyOptional() @IsOptional() @IsInt() group_id?: number;
}

export class UpdateScheduleGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
  // Laravel: 'end_date' => 'date' — Y-m-d kutiladi. Yangi tugash sanasi
  // joriy `end_date`'dan oshmasligi kerak (shorten only). Bu sanadan
  // keyingi schedule rows force-delete qilinadi.
  @ApiPropertyOptional({ example: '2026-06-07' })
  @IsOptional() @IsString() end_date?: string;
}
