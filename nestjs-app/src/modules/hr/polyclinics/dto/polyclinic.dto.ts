// Polyclinic DTO'lari. Laravel: HR/OrganizationPolyclinicController.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryPolyclinicDto extends SearchPaginationQueryDto {}

// POST /api/v1/hr/polyclinics — Laravel: validate('polyclinics' => 'required|array').
export class CreatePolyclinicDto {
  @ApiProperty({ example: [161], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
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
