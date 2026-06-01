// Lessons DTO'lari. Laravel: LessonController index/store validatsiyasi.
//
// MUHIM (validation parity): field tartibi va `@IsNotEmpty` Laravel `$request->validate([...])`
// massiviga AYNAN mos bo'lishi shart — chunki `errors` obyekti kalitlari va "1-xato"
// xabari shu tartibga bog'liq. Laravel `required` → NestJS `@IsNotEmpty`
// (absent/null/'' → "required" xabari).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// GET /lms/lessons — Laravel:
//   'learning_center_id' => 'required',
//   'start_date'         => 'required|date',
//   'end_date'           => 'required|date|after_or_equal:start_date',
export class LessonCalendarQueryDto {
  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  learning_center_id!: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsNotEmpty()
  @IsString()
  start_date!: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsNotEmpty()
  @IsString()
  end_date!: string;
}

// POST/PUT /lms/lessons — Laravel store validate() tartibi:
//   learning_center_id, lesson_date, edu_plan_id, group_id, subject_id, teacher_id,
//   name, name_en, name_ru, start_time, end_time
// (name/name_en/name_ru — `required|sometimes` = ixtiyoriy).
export class UpsertLessonDto {
  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  learning_center_id!: number;

  @ApiProperty({ example: '2026-06-15' })
  @IsNotEmpty()
  @IsString()
  lesson_date!: string;

  @ApiProperty({ example: 252 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  edu_plan_id!: number;

  @ApiProperty({ example: 72 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  group_id!: number;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  subject_id!: number;

  @ApiProperty({ example: 3 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  teacher_id!: number;

  @ApiPropertyOptional({ example: 'Modul 1 — kirish darsi' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Module 1 — intro lesson' })
  @IsOptional()
  @IsString()
  name_en?: string;

  @ApiPropertyOptional({ example: 'Модуль 1 — вводный урок' })
  @IsOptional()
  @IsString()
  name_ru?: string;

  @ApiProperty({ example: '09:00' })
  @IsNotEmpty()
  @IsString()
  start_time!: string;

  @ApiProperty({ example: '10:30' })
  @IsNotEmpty()
  @IsString()
  end_time!: string;
}
