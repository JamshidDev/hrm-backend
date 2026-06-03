// Integration log filter DTO'lari. Laravel: IntegrationApiLogController.
// `filteredQuery` parity:
//   - date_from, date_to (default: last 7 days)
//   - api_type (hmac/sanctum/jwt/oauth)
//   - model_type, model_id
//   - method (uppercased)
//   - response_status
//   - endpoint (ILIKE)
//   - search (secret/endpoint ILIKE)

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class IntegrationLogFilterDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  // Laravel: when(api_type) → where('api_type', value) — validatsiya YO'Q (noma'lum
  // qiymat 0 qaytaradi, 422 emas). Shuning uchun IsIn emas, oddiy string.
  @ApiPropertyOptional({ example: 'sanctum' })
  @IsOptional()
  @IsString()
  api_type?: string;

  @ApiPropertyOptional({ example: 'App\\Models\\User' })
  @IsOptional()
  @IsString()
  model_type?: string;

  @ApiPropertyOptional({ example: 12260 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  model_id?: number;

  @ApiPropertyOptional({ example: 'GET' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  response_status?: number;

  @ApiPropertyOptional({ example: 'integration/workers' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ example: 'enums' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class IntegrationLogTimelineDto extends IntegrationLogFilterDto {
  @ApiPropertyOptional({ example: 'day', enum: ['day', 'hour'] })
  @IsOptional()
  @IsIn(['day', 'hour'])
  group_by?: 'day' | 'hour';
}

export class IntegrationLogTopDto extends IntegrationLogFilterDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateHmacUserDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 'Integration Client X' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '916334004' })
  @IsOptional()
  @IsString()
  public_key?: string;

  @ApiPropertyOptional({ example: 'secret-hash' })
  @IsOptional()
  @IsString()
  secret_key?: string;

  @ApiPropertyOptional({ example: 'sanctum_user' })
  @IsOptional()
  @IsString()
  secret_type?: string;
}
