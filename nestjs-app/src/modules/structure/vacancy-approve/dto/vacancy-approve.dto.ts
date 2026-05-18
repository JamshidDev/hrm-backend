// VacancyApprove DTO'lari. Laravel: VacancyApproveOrganizationController + OrganizationApproveResource.
//   - index: paginate with from_organization + to_organization
//   - attach: bulk insert (replaces existing for from_organization_id)
//   - destroy: delete by id

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
} from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryVacancyApproveDto extends PaginationQueryDto {}

export class AttachVacancyApproveDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  from_organization_id!: number;

  @ApiProperty({ example: [2, 3], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  to_organization_ids!: number[];
}

// ========== RESPONSE ==========

// OrganizationListResource — {id, name (localized), group}.
export class VacancyOrganizationMinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot nomi', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

export class VacancyApproveItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: VacancyOrganizationMinDto, nullable: true })
  from!: VacancyOrganizationMinDto | null;

  @ApiProperty({ type: VacancyOrganizationMinDto, nullable: true })
  to!: VacancyOrganizationMinDto | null;
}

export class VacancyApproveListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [VacancyApproveItemDto] })
  data!: VacancyApproveItemDto[];
}
