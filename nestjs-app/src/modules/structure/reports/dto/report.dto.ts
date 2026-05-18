// Report DTO'lari. Laravel: ReportController + ReportIndexResource + ReportMonthPerResource.
//
// Hozirgi qamrov (7 endpoint):
//   - GET    /reports                     (index)
//   - DELETE /reports/{id}                 (destroy)
//   - DELETE /reports-detail/{id}          (destroyDetail)
//   - DELETE /report/delete-confirmation/{id} (deleteConfirmation)
//   - GET    /reports-per-month            (indexReportMonthOrganizations)
//   - PUT    /reports-per-month            (updateReportMonthOrganizations — bulk)
//   - DELETE /reports-per-month/{id}       (destroyReportMonthOrganizations)
//
// Skip (alohida sessiya — biznes mantiqi murakkab):
//   - POST  /report/generate, /labels, /store, /excel, /create-confirmation
//   - PUT   /reports/{id}, /reports-detail/{id}
//   - GET   /reports-stat, /reports/{uuid} (show — Confirmation module kerak)

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryReportDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '1,2' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  month?: number;
}

export class QueryReportMonthDto extends PaginationQueryDto {}

export class UpdateReportMonthDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  year!: number;

  @ApiProperty({ example: 5, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  month!: number;

  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  organizations!: number[];
}

// ========== RESPONSE ==========

// OrganizationListResource — {id, name (localized), group}.
export class ReportOrganizationDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot nomi', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

export class ReportConfirmationDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Jarayonda' })
  name!: string;
}

export class ReportItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '0b5b3658-...' })
  uuid!: string;

  @ApiProperty({ example: 2026, nullable: true })
  year!: number | null;

  @ApiProperty({ example: 5, nullable: true })
  month!: number | null;

  @ApiProperty({ type: ReportOrganizationDto, nullable: true })
  organization!: ReportOrganizationDto | null;

  @ApiProperty({ example: 'https://...', nullable: true })
  file!: string | null;

  @ApiProperty({ example: 'https://...', nullable: true })
  confirmation_file!: string | null;

  @ApiProperty({ type: ReportConfirmationDto })
  confirmation!: ReportConfirmationDto;

  @ApiProperty({ example: 1 })
  generate!: number;

  @ApiProperty({ example: '2026-05-01T12:00:00.000000Z', nullable: true })
  created_at!: string | null;

  @ApiProperty({ example: 5 })
  details_count!: number;
}

export class ReportListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ type: [ReportItemDto] })
  data!: ReportItemDto[];
}

// ReportMonthPerResource: {id, year, month, organization (minimal)}.
export class ReportMonthPerItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ example: 5 })
  month!: number;

  @ApiProperty({ type: ReportOrganizationDto, nullable: true })
  organization!: ReportOrganizationDto | null;
}

export class ReportMonthPerListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [ReportMonthPerItemDto] })
  data!: ReportMonthPerItemDto[];
}
