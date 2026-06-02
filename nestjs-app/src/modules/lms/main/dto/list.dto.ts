// LMS list/* endpointlari uchun query DTO. Laravel: page, per_page, search.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class LmsListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Laravel'da `per_page` cheklov yo'q.
  @ApiPropertyOptional({ example: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;

  @ApiPropertyOptional({ example: 'Korrupsiya' })
  @IsOptional()
  @IsString()
  search?: string;
}
