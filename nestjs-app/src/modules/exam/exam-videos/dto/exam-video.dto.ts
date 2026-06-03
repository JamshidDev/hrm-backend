// Laravel Start/FinishExamVideoRequest: worker_exam_id required|exists:worker_exams,id.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class ExamVideoIdDto {
  @ApiProperty({ example: 49706 })
  @Type(() => Number)
  @IsInt()
  worker_exam_id!: number;
}
