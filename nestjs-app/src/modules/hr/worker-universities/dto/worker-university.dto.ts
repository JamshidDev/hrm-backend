// WorkerUniversity DTO'lari. Laravel: WorkerUniversityController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerUniversityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() per_page?: number;
}

export class CreateWorkerUniversityDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty() @Type(() => Number) @IsInt() @Exists('universities', 'id')
  university_id!: number;

  @ApiProperty() @Type(() => Number) @IsInt() @Exists('specialities', 'id')
  speciality_id!: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() from_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

export class UpdateWorkerUniversityDto extends CreateWorkerUniversityDto {}

// ---------- Response ----------

export class WorkerUniversitySpecialityDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) name_ru!: string | null;
}

export class WorkerUniversityRegionDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
}

export class WorkerUniversityCityDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: WorkerUniversityRegionDto, nullable: true })
  region!: WorkerUniversityRegionDto | null;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) name_ru!: string | null;
  @ApiProperty({ nullable: true }) name_en!: string | null;
  @ApiProperty({ nullable: true }) lat!: string | null;
  @ApiProperty({ nullable: true }) long!: string | null;
}

export class WorkerUniversityUniversityDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: WorkerUniversityCityDto, nullable: true })
  city!: WorkerUniversityCityDto | null;
  @ApiProperty({ example: { id: 1, name: 'Oliy' } })
  education!: { id: number; name: string };
  @ApiProperty({ example: { id: 1, name: 'Oliy ta\'lim muassasasi' } })
  type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) name_ru!: string | null;
  @ApiProperty({ nullable: true }) name_en!: string | null;
}

export class WorkerUniversityItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: WorkerUniversitySpecialityDto, nullable: true })
  speciality!: WorkerUniversitySpecialityDto | null;
  @ApiProperty({ type: WorkerUniversityUniversityDto, nullable: true })
  university!: WorkerUniversityUniversityDto | null;
  @ApiProperty({ nullable: true }) from_date!: string | null;
  @ApiProperty({ nullable: true }) to_date!: string | null;
  @ApiProperty({ nullable: true }) file!: string | null;
}

export class WorkerUniversityListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [WorkerUniversityItemDto] })
  data!: WorkerUniversityItemDto[];
}
