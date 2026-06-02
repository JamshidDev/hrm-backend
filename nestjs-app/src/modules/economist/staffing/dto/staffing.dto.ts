// Staffing modul DTO'lari.
// Laravel: viewGenerateChanges (GET generate), generate (POST), index, destroy, show.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { YearMonthPaginationDto } from '@/modules/economist/_shared/dto/base-query.dto';

/**
 * Confirmation item — {id, order}. Frontend har bir tasdiqlovchini order bilan yuboradi;
 * service order bo'yicha sort qilib worker_position ID'larini extract qiladi.
 */
export class ConfirmationItemDto {
  @ApiProperty({ example: 249 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order!: number;
}

/**
 * GET /api/v1/economist/staffing/generate?organization_id=
 */
export class StaffingGenerateViewQueryDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;
}

/**
 * POST /api/v1/economist/staffing/generate
 * Body: department_positions, confirmations, director_id, confirmatory_id, date.
 */
export class StaffingGenerateDto {
  @ApiPropertyOptional({ description: 'Sana (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: 19,
    description:
      'department_positions org-filter (Laravel changedPositions request org). Yo`q bo`lsa user org.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;

  @ApiProperty({
    type: [Number],
    description: 'department_positions ID`lari',
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  department_positions!: number[];

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffing_approve_id?: number;

  @ApiProperty({ example: 10, description: 'Tasdiqlovchi worker_position ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  confirmatory_id!: number;

  @ApiProperty({ example: 11, description: 'Direktor worker_position ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  director_id!: number;

  @ApiProperty({
    type: [ConfirmationItemDto],
    description: 'Tasdiqlovchi worker_position`lar ({id, order})',
    example: [
      { id: 249, order: 1 },
      { id: 329, order: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmationItemDto)
  confirmations!: ConfirmationItemDto[];
}

/**
 * GET /api/v1/economist/staffing/approve
 * Laravel filter($user, request()->all()) — organizations (csv) + organization_id org-scope.
 */
export class StaffingApproveListQueryDto extends YearMonthPaginationDto {
  @ApiPropertyOptional({
    example: '140,151',
    description: 'CSV organization ids',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 137 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;
}
