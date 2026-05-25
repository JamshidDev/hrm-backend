// Disciplinary DTO'lari. Laravel: HR/OrganizationDisciplinaryController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryDisciplinaryDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizations?: string;

  // Laravel Contract pattern: when(created) → whereDate('created_at', created).
  @ApiPropertyOptional({ example: '2026-05-03' })
  @IsOptional()
  @IsString()
  created?: string;
}

// ---------- Response ----------

export class DisciplinaryWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class DisciplinaryOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class DisciplinaryWorkerPositionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: DisciplinaryWorkerDto, nullable: true })
  worker!: DisciplinaryWorkerDto | null;
  @ApiProperty({ type: DisciplinaryOrgDto, nullable: true })
  organization!: DisciplinaryOrgDto | null;
  @ApiProperty() post_name!: string;
  @ApiProperty() post_short_name!: string;
}

export class DisciplinaryItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: DisciplinaryOrgDto, nullable: true })
  organization!: DisciplinaryOrgDto | null;
  @ApiProperty({ type: DisciplinaryWorkerPositionDto, nullable: true })
  worker_position!: DisciplinaryWorkerPositionDto | null;
  @ApiProperty({ nullable: true }) date!: string | null;
  @ApiProperty({ nullable: true }) fine!: string | null;
  @ApiProperty() fine_type!: number;
  @ApiProperty({ nullable: true }) reason!: string | null;
  @ApiProperty({ nullable: true }) number!: string | null;
}

export class DisciplinaryListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [DisciplinaryItemDto] }) data!: DisciplinaryItemDto[];
}
