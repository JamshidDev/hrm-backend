// Vacancy exam DTO'lar. Laravel: Vacancy/VacancyExamController.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

// POST /v1/vacancies/applications/:id/exam/start — Laravel `vacancy_application_exam_id` majburiy.
export class StartExamDto {
  @ApiProperty({ description: 'Vacancy application exam id' })
  @Type(() => Number)
  @IsInt()
  vacancy_application_exam_id!: number;
}
