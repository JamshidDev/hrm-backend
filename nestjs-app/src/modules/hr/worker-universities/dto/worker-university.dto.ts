// WorkerUniversity DTO'lari. Laravel: WorkerUniversityController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerUniversityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() uuid?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;
}

// Laravel WorkerUniversityStoreRequest: { uuid, university_id, speciality_id, from_date, to_date, file? }
// `uuid` — worker UUID; resolved server-side to worker_id.
export class CreateWorkerUniversityDto {
  @ApiProperty({ example: '63fc3e7a-9798-4250-9d92-2262165a1132' })
  @IsUUID()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('universities', 'id')
  university_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('specialities', 'id')
  speciality_id!: number;

  @ApiProperty() @IsDateString() from_date!: string;
  @ApiProperty() @IsDateString() to_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

// Update — no `uuid` (worker unchanged).
export class UpdateWorkerUniversityDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('universities', 'id')
  university_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('specialities', 'id')
  speciality_id!: number;

  @ApiProperty() @IsDateString() from_date!: string;
  @ApiProperty() @IsDateString() to_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}

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
  @ApiProperty({ example: { id: 1, name: "Oliy ta'lim muassasasi" } })
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
