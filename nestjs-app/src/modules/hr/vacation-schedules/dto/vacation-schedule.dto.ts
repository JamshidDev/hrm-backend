// VacationSchedule DTO'lari. Laravel: HR/VacationScheduleController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryVacationScheduleDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizations?: string;
}

export class CreateVacationScheduleDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('worker_positions', 'id')
  worker_position_id!: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class UpdateVacationScheduleDto {
  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

// ---------- Response ----------

export class VacationScheduleWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class VacationScheduleOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class VacationScheduleItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VacationScheduleOrgDto, nullable: true })
  organization!: VacationScheduleOrgDto | null;
  @ApiProperty({ type: VacationScheduleWorkerDto, nullable: true })
  worker!: VacationScheduleWorkerDto | null;
  @ApiProperty() month!: number;
}

export class VacationScheduleListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [VacationScheduleItemDto] })
  data!: VacationScheduleItemDto[];
}
