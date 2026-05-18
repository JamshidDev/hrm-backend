// Polyclinic DTO'lari. Laravel: HR/OrganizationPolyclinicController.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryPolyclinicDto extends SearchPaginationQueryDto {}

export class CreatePolyclinicDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  polyclinic_id!: number;
}

// ---------- Response ----------

export class PolyclinicItemDto {
  @ApiProperty({ nullable: true }) id!: number | null;
  @ApiProperty({ nullable: true }) name!: string | null;
}

export class PolyclinicListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [PolyclinicItemDto] })
  data!: PolyclinicItemDto[];
}
