// Vacation DTO'lari. Laravel: HR/VacationController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryVacationDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;
}

// POST /vacations/create — getLastVacations(worker_positions: int[])
export class VacationCreateDto {
  @ApiProperty({ example: [1, 2, 3], description: 'WorkerPosition IDs' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  worker_positions!: number[];
}

// POST /vacations/calculate — items: [{id, from, main_day, second_day, additional?}]
export class VacationCalculateAdditionalDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  value!: number;
}

export class VacationCalculateItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  id!: number;

  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: 14 })
  @Type(() => Number)
  @IsInt()
  main_day!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  second_day!: number;

  @ApiPropertyOptional({ type: () => [VacationCalculateAdditionalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacationCalculateAdditionalDto)
  additional?: VacationCalculateAdditionalDto[];
}

export class VacationCalculateDto {
  @ApiProperty({ type: () => [VacationCalculateItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VacationCalculateItemDto)
  worker_positions!: VacationCalculateItemDto[];
}

// ---------- Response ----------

export class VacationWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class VacationOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class VacationWorkerPositionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VacationWorkerDto, nullable: true })
  worker!: VacationWorkerDto | null;
  @ApiProperty({ type: VacationOrgDto, nullable: true })
  organization!: VacationOrgDto | null;
  @ApiProperty() post_name!: string;
  @ApiProperty() post_short_name!: string;
}

export class VacationItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VacationWorkerPositionDto, nullable: true })
  worker_position!: VacationWorkerPositionDto | null;
  @ApiProperty({ example: { id: 1, name: "Mehnat ta'tili" } })
  type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) from!: string | null;
  @ApiProperty({ nullable: true }) to!: string | null;
  @ApiProperty({ nullable: true }) work_day!: string | null;
  @ApiProperty() rest_day!: number;
  @ApiProperty() main_day!: number;
  @ApiProperty() second_day!: number;
  @ApiProperty() all_day!: number;
}

export class VacationListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [VacationItemDto] }) data!: VacationItemDto[];
}
