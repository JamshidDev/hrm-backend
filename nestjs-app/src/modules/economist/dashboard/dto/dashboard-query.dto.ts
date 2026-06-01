// Dashboard endpoint uchun query DTO.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { YearMonthQueryDto } from '@/modules/economist/_shared/dto/base-query.dto';

/**
 * GET /api/v1/economist/dashboard?year=&month=
 * year/month — 8 oy ortga sanash uchun boshlang'ich nuqta (default: joriy).
 * organizations/organization_id — Laravel `filter($user, request()->all())` org-scope.
 */
export class DashboardQueryDto extends YearMonthQueryDto {
  @ApiPropertyOptional({
    example: '151,154',
    description: 'CSV organization ids',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 222 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}
