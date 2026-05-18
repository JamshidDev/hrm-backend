// Hospital DTO'lar. Laravel: Med/SendedWorkerController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// GET /api/v1/med/hospital/tickets — paginatsiya.
export class QueryHospitalTicketsDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (default: 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}

// POST /api/v1/med/hospital/tickets-attach — komissiyani biriktirish.
export class AttachCommissionDto {
  @ApiProperty({ description: 'Sended worker (ticket) id', example: 1 })
  @Type(() => Number)
  @IsInt()
  sended_worker_id!: number;

  @ApiProperty({ description: 'Commission id', example: 1 })
  @Type(() => Number)
  @IsInt()
  commission_id!: number;
}

// POST /api/v1/med/hospital/tickets/{id}/confirm — hujjatni tasdiqlash.
// Laravel: med_status, med_date, to — majburiy (validate AVVAL ishlaydi → bo'sh body 422).
export class ConfirmDocumentDto {
  @ApiProperty({ description: 'Medical check status' })
  @IsString()
  @IsNotEmpty()
  med_status!: string;

  @ApiProperty({ description: 'Medical check date (YYYY-MM-DD)' })
  @IsDateString()
  med_date!: string;

  @ApiProperty({ description: 'Valid-until date (YYYY-MM-DD)' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ description: 'Confirmation comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Confirmation file (base64 or path)' })
  @IsOptional()
  file?: unknown;
}
