// HR Dashboard Views DTO — query params for paginated lists.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class BirthdaysQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() birth_day?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() birth_month?: number;
}

export class WorkersByEducationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'education id (1..3)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;
}

export class WorkerByAgeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() age_start?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() age_end?: number;
  @ApiPropertyOptional({ description: '1=man, 0=woman' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sex?: number;
}

export class WorkerByPassportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['not_included', 'expired'] })
  @IsOptional()
  @IsString()
  filter?: string;
}

export class WorkerByPensionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '1=man, 0=woman' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sex?: number;
}

export class WorkerByMedQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['finished', 'approaching'] })
  @IsOptional()
  @IsString()
  type?: string;
}

export class DisabilityPreviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() level?: number;
}

export class SickLeavePreviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() type?: number;
  @ApiPropertyOptional({ enum: ['active', 'finished'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class DashboardYearQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() type?: number;
}

export class ContractsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['created', 'ended'] })
  @IsOptional()
  @IsIn(['created', 'ended'])
  type?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() month?: number;
}

export class WorkerByContractTypeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ContractType id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;
}
