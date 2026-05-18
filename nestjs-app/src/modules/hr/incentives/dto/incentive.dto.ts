// Incentive DTO'lari. Laravel: HR/OrganizationIncentiveController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryIncentiveDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;
}

// ---------- Response ----------

export class IncentiveWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class IncentiveOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class IncentiveWorkerPositionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: IncentiveWorkerDto, nullable: true })
  worker!: IncentiveWorkerDto | null;
  @ApiProperty({ type: IncentiveOrgDto, nullable: true })
  organization!: IncentiveOrgDto | null;
  @ApiProperty() post_name!: string;
  @ApiProperty() post_short_name!: string;
}

export class IncentiveItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: IncentiveOrgDto, nullable: true })
  organization!: IncentiveOrgDto | null;
  @ApiProperty({ type: IncentiveWorkerPositionDto, nullable: true })
  worker_position!: IncentiveWorkerPositionDto | null;
  @ApiProperty({ nullable: true }) date!: string | null;
  @ApiProperty({ nullable: true }) by_whom!: string | null;
  @ApiProperty({ nullable: true }) gift!: string | null;
  @ApiProperty() gift_type!: number;
  @ApiProperty({ nullable: true }) reason!: string | null;
  @ApiProperty({ nullable: true }) number!: string | null;
}

export class IncentiveListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [IncentiveItemDto] }) data!: IncentiveItemDto[];
}
