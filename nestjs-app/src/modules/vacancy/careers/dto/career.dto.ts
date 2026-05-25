// Career DTO'lar. Laravel: Vacancy/VacancyUserCareerController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// POST /v1/vacancies/careers — Laravel `from` va `position` majburiy.
export class CreateCareerDto {
  @ApiProperty({ description: 'Job position / role title' })
  @IsString()
  @IsNotEmpty()
  position!: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  from!: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

// PUT /v1/vacancies/careers/:id — barcha maydonlar ixtiyoriy (sometimes).
export class UpdateCareerDto {
  @ApiPropertyOptional({ description: 'Job position / role title' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
