// Vacancy DTO'lari. Laravel: HR/VacancyPositionController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryVacancyDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;
}

// ---------- Response ----------

export class VacancyRegionDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
}

export class VacancyCityDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VacancyRegionDto, nullable: true })
  region!: VacancyRegionDto | null;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) name_ru!: string | null;
  @ApiProperty({ nullable: true }) name_en!: string | null;
  @ApiProperty({ nullable: true }) lat!: string | null;
  @ApiProperty({ nullable: true }) long!: string | null;
}

export class VacancyOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class VacancyPositionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
}

export class VacancyDepartmentDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty() level!: number;
}

export class VacancyItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VacancyOrgDto, nullable: true }) organization!: VacancyOrgDto | null;
  @ApiProperty({ type: VacancyPositionDto, nullable: true }) position!: VacancyPositionDto | null;
  @ApiProperty({ type: VacancyDepartmentDto, nullable: true }) department!: VacancyDepartmentDto | null;
  @ApiProperty() rate!: number;
  @ApiProperty({ nullable: true }) to!: string | null;
  @ApiProperty() finish!: number;
  @ApiProperty({ type: VacancyCityDto, nullable: true }) city!: VacancyCityDto | null;
  @ApiProperty() salary!: number;
  @ApiProperty() salary_status!: boolean;
  @ApiProperty() phd_status!: boolean;
  @ApiProperty() experience!: number;
  @ApiProperty() vacancy_status!: { id: number; name: string };
  @ApiProperty() work_type!: { id: number; name: string };
  @ApiProperty() education!: { id: number; name: string };
  @ApiProperty() applications_count!: number;
  @ApiProperty() status!: boolean;
}

export class VacancyListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [VacancyItemDto] }) data!: VacancyItemDto[];
}
