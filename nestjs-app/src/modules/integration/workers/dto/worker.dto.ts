// Integration workers DTO'lari.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class WorkersByPinsDto {
  @ApiProperty({ example: [12345678, 87654321], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  pins!: number[];
}

export class WorkerByPinQueryDto {
  @ApiProperty({
    example: 12345678,
    description: 'Pin (majburiy, Laravel parity)',
  })
  @Type(() => Number)
  @IsInt()
  pin!: number;
}

export class WorkerUuidParamDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  workerUuid!: string;
}

// Laravel IntegrationWorkersRequest — GET /integration/workers filtrlari.
export class IntegrationWorkersQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_position_id?: number;

  @ApiPropertyOptional({ example: '1,2,3' })
  @IsOptional()
  @IsString()
  departments?: string;

  @ApiPropertyOptional({ example: '1,2,3' })
  @IsOptional()
  @IsString()
  positions?: string;

  @ApiPropertyOptional({ example: '1,2,3' })
  @IsOptional()
  @IsString()
  ids?: string;

  @ApiPropertyOptional({ description: 'organizations csv (scope)' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ example: 'last_name,first_name' })
  @IsOptional()
  @IsString()
  order?: string;

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  direction?: string;
}

// Laravel IntegrationTurnstileEventsByMonthRequest: month/year required.
export class TurnstileEventsMonthQueryDto {
  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;
}

// Laravel IntegrationTurnstileEventsByDayRequest: date required.
export class TurnstileEventsDayQueryDto {
  @ApiProperty({ example: '2026-06-12' })
  @IsDateString()
  date!: string;
}
