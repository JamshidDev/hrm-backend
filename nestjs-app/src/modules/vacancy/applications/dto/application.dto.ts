// Application DTO'lar. Laravel: Vacancy/VacancySendController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

// POST /v1/vacancies/send-application — Laravel `vacancy_position_id` majburiy.
export class SendApplicationDto {
  @ApiProperty({ description: 'Vacancy position id', example: 1 })
  @Type(() => Number)
  @IsInt()
  vacancy_position_id!: number;

  @ApiPropertyOptional({ description: 'Optional uploaded files', type: [Object] })
  @IsOptional()
  @IsArray()
  files?: unknown[];
}

// GET /v1/vacancies/applications — status bo'yicha filter.
export class QueryApplicationDto {
  @ApiPropertyOptional({ description: 'Filter by application status' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

// POST /v1/vacancies/applications/:id/files — qo'shimcha fayllar yuklash.
export class UploadFilesDto {
  @ApiProperty({ description: 'Files to upload', type: [Object] })
  @IsArray()
  uploads!: Array<{ type: number; file: string; file_name?: string }>;
}
