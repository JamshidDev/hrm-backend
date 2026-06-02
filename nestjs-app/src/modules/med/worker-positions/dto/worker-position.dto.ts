// Med worker-positions DTO. Laravel: Med/WorkerController::index
// (organizations + remainingFilter + search + status=ACTIVE).

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class QueryMedWorkerPositionDto {
  @ApiPropertyOptional({ description: 'Page (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Per page (default 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  // Laravel scopeSearch — whereHas('worker', SearchByFullName) + last/first/middle like.
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() last_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() first_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middle_name?: string;

  // CSV filterlar (explode(',')).
  @ApiPropertyOptional({ description: 'CSV organization ids' })
  @IsOptional()
  @IsString()
  organizations?: string;
  @ApiPropertyOptional({ description: 'CSV department ids' })
  @IsOptional()
  @IsString()
  departments?: string;
  @ApiPropertyOptional({ description: 'CSV position ids' })
  @IsOptional()
  @IsString()
  positions?: string;
  @ApiPropertyOptional({ description: 'CSV department_position ids' })
  @IsOptional()
  @IsString()
  department_positions?: string;
  @ApiPropertyOptional({ description: 'CSV nationality ids' })
  @IsOptional()
  @IsString()
  nationalities?: string;
  @ApiPropertyOptional({ description: 'CSV education ids' })
  @IsOptional()
  @IsString()
  educations?: string;

  // worker_position / contract.
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contract_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contract_type?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position_type?: number;

  // worker.
  @ApiPropertyOptional({ description: 'Birthday month (1-12)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  birthday?: number;
  @ApiPropertyOptional({ description: '0/1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sex?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age_start?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age_end?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  marital_status?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  country_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  region_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  city_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  current_region_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  current_city_id?: number;
}
