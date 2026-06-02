// Chat telegram DTO'lari.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TelegramMessagesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  // Laravel WorkerPosition::filter — org-scope (childIds) + organizations csv + single.
  @ApiPropertyOptional({ description: 'CSV organization ids' })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ description: 'Single organization id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organization_id?: number;
}
