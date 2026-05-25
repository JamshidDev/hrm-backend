// Education DTO'lar. Laravel: Vacancy/VacancyUserEducationController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// POST /v1/vacancies/educations — Laravel `from` (date) va `university` majburiy.
export class CreateEducationDto {
  @ApiProperty({ description: 'University / institution name' })
  @IsString()
  @IsNotEmpty()
  university!: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  from!: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

// PUT /v1/vacancies/educations/:id — barcha maydonlar ixtiyoriy (sometimes).
export class UpdateEducationDto {
  @ApiPropertyOptional({ description: 'University / institution name' })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
