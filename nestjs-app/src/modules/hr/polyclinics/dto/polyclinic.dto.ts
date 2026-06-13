// Polyclinic DTO'lari. Laravel: HR/OrganizationPolyclinicController.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryPolyclinicDto extends SearchPaginationQueryDto {}

// POST /api/v1/hr/polyclinics — Laravel: validate('polyclinics' => 'required|array').
export class CreatePolyclinicDto {
  // Laravel: 'polyclinics' => 'required|array' (faqat shu ikki rule).
  @ApiProperty({ example: [161], type: [Number] })
  @IsNotEmpty()
  @IsArray()
  @Type(() => Number)
  polyclinics!: number[];
}

// ---------- Response ----------

export class PolyclinicItemDto {
  @ApiProperty({ nullable: true }) id!: number | null;
  @ApiProperty({ nullable: true }) name!: string | null;
}

export class PolyclinicListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [PolyclinicItemDto] })
  data!: PolyclinicItemDto[];
}
