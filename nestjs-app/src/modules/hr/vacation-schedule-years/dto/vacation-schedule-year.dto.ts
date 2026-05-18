// VacationScheduleYear DTO'lari. Laravel: HR/VacationScheduleYearController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryVacationScheduleYearDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year?: number;
}

export class StoreVacationScheduleYearDto {
  @ApiProperty({ example: 2025 }) @Type(() => Number) @IsInt() year!: number;

  @ApiProperty({ type: () => [Object], description: 'Worker position assignments' })
  @IsArray()
  @ArrayMinSize(1)
  worker_position_ids!: Array<{ id: number; month?: number }>;

  @ApiProperty() @Type(() => Number) @IsInt() director_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() trade_union_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() creator_id!: number;
  @ApiProperty({ example: '2025-01-15' }) @IsDateString() date!: string;
}

// ---------- Response ----------

export class VSYWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class VSYConfirmationWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VSYWorkerDto, nullable: true })
  worker!: VSYWorkerDto | null;
  @ApiProperty({ nullable: true }) position!: string | null;
}

export class VSYCreatorDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VSYWorkerDto, nullable: true })
  worker!: VSYWorkerDto | null;
  @ApiProperty() post_name!: string;
  @ApiProperty() post_short_name!: string;
}

export class VSYOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  // Laravel `organization:id,name,name_en,name_ru` — `group` NOT loaded.
  @ApiProperty({ nullable: true }) group!: boolean | null;
}

export class VacationScheduleYearItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: VSYOrgDto, nullable: true }) organization!: VSYOrgDto | null;
  @ApiProperty() year!: number;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ nullable: true }) date!: string | null;
  @ApiProperty({ type: VSYConfirmationWorkerDto, nullable: true })
  director!: VSYConfirmationWorkerDto | null;
  @ApiProperty({ type: VSYConfirmationWorkerDto, nullable: true })
  tradeUnion!: VSYConfirmationWorkerDto | null;
  @ApiProperty({ type: VSYCreatorDto, nullable: true })
  creator!: VSYCreatorDto | null;
  @ApiProperty({ nullable: true }) file!: string | null;
  @ApiProperty({ nullable: true }) confirmation_file!: string | null;
  @ApiProperty() generate!: number;
  @ApiProperty() confirmation!: { id: number; name: string };
}

export class VacationScheduleYearListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [VacationScheduleYearItemDto] })
  data!: VacationScheduleYearItemDto[];
}
