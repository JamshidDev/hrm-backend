// Confirmation list DTO. Laravel: Confirmation/*ConfirmationController.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryConfirmationDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}
