// Turnstile schedule type DTOs. Laravel: TurnstileScheduleTypeController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryScheduleTypeDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  // Org-scope filters — Laravel $q->filter($user, request()->all()).
  // CSV list of organization ids.
  @ApiPropertyOptional({ example: '151,154' })
  @IsOptional() @IsString()
  organizations?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() organization_id?: number;
  // CSV of department ids — restrict aggregation to those departments.
  // Laravel'da yo'q (kengaytma) — frontend filter sifatida ishlatadi.
  @ApiPropertyOptional({ example: '4800,3722' })
  @IsOptional() @IsString()
  departments?: string;
  // year+month — restrict aggregation to groups ACTIVE in that month
  // (start_date <= month_end AND end_date >= month_start). Laravel'da yo'q.
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @IsInt() month?: number;
}

export class CreateScheduleTypeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsInt() type!: number;
  @ApiProperty({ type: [Object] }) @IsArray() days!: unknown[];
}

export class UpdateScheduleTypeDto extends CreateScheduleTypeDto {}
