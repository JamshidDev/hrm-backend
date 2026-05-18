// Leader DTO'lari. Laravel: HR/OrganizationLeaderController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class CreateLeaderDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('worker_positions', 'id')
  worker_position_id!: number;

  @ApiPropertyOptional({ type: () => [String] })
  @IsOptional()
  @IsArray()
  phones?: string[];
}

export class UpdateLeaderDto {
  @ApiPropertyOptional({ type: () => [String] })
  @IsOptional()
  @IsArray()
  phones?: string[];
}

export class QueryLeaderDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;
}

// ---------- Response ----------

export class LeaderWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class LeaderOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class LeaderWorkerPositionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: LeaderWorkerDto, nullable: true })
  worker!: LeaderWorkerDto | null;
  @ApiProperty() post_name!: string;
  @ApiProperty() post_short_name!: string;
}

export class LeaderItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: LeaderOrgDto, nullable: true })
  organization!: LeaderOrgDto | null;
  @ApiProperty({ type: LeaderWorkerPositionDto, nullable: true })
  worker_position!: LeaderWorkerPositionDto | null;
  @ApiProperty() phone!: unknown;
}

export class LeaderListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [LeaderItemDto] }) data!: LeaderItemDto[];
}
