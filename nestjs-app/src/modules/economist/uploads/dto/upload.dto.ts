// Uploads modul DTO'lari — 5 ta endpoint uchun.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UploadType } from '@/modules/economist/_shared/upload-enums';
import { YearMonthQueryDto } from '@/modules/economist/_shared/dto/base-query.dto';

const UPLOAD_TYPE_VALUES = [
  UploadType.STATEMENTS,
  UploadType.TAX_FOUR,
  UploadType.TAX_FIVE,
  UploadType.PENSION_PAYMENTS,
];

const REFRESH_TYPE_VALUES = [
  'statements',
  'tax-four-applications',
  'tax_four_applications',
  'tax-five-applications',
  'tax_five_applications',
  'pension-payments',
  'pension_payments',
] as const;

/**
 * POST /api/v1/economist/upload (multipart)
 * `file` Multer orqali alohida, body'da metadata.
 */
export class CreateUploadDto {
  @ApiProperty({ example: 3, description: 'Tashkilot ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id!: number;

  @ApiProperty({
    example: 1,
    enum: UPLOAD_TYPE_VALUES,
    description: '1=statements, 2=tax-4, 3=tax-5, 4=pension',
  })
  @Type(() => Number)
  @IsInt()
  @IsIn(UPLOAD_TYPE_VALUES)
  type!: number;

  @ApiProperty({ example: 2025, minimum: 2010, maximum: 2030 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

/**
 * GET /api/v1/economist/upload-histories?organization_id=&year=&month=
 * Laravel: 3 ta field ham `required`.
 */
export class UploadHistoryQueryDto extends YearMonthQueryDto {
  @ApiProperty({ example: 3, description: 'Tashkilot ID (majburiy)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id!: number;

  @ApiProperty({ example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  declare year: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  declare month: number;
}

/**
 * POST /api/v1/economist/upload-statuses
 * Deadline override toggle.
 */
export class UpdateUploadStatusDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id!: number;

  @ApiProperty({ example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({
    example: true,
    description: 'true → override yaratiladi, false → o`chiriladi',
  })
  @IsBoolean()
  status!: boolean;
}

/**
 * POST /api/v1/economist/upload-histories/confirm
 * Eng so'nggi upload'ni SUCCESS qiladi.
 */
export class ConfirmUploadDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id!: number;

  @ApiProperty({ example: 1, enum: UPLOAD_TYPE_VALUES })
  @Type(() => Number)
  @IsInt()
  @IsIn(UPLOAD_TYPE_VALUES)
  type!: number;

  @ApiProperty({ example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

/**
 * GET /api/v1/economist/refresh-worker-pins?type=&year=&month=
 * Laravel: type + year + month — barchasi `required`.
 */
export class RefreshWorkerPinsDto {
  @ApiProperty({
    example: 'statements',
    enum: REFRESH_TYPE_VALUES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(REFRESH_TYPE_VALUES)
  type!: string;

  @ApiProperty({ example: 2025 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

/**
 * Boshqa `upload-histories` filter — ixtiyoriy. Soddalashtirilgan list.
 */
export class UploadHistoryFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
