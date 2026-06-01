// Listener DTO'lari. Laravel: ListenerLessonController::index validatsiyasi.
//
//   'start_date' => 'required|date',
//   'end_date'   => 'required|date|after_or_equal:start_date',
//
// learning_center_id YO'Q (Lesson calendar'dan farqli). Field tartibi Laravel
// validate() massiviga mos: start_date, end_date.

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ListenerCalendarQueryDto {
  @ApiProperty({ example: '2026-06-01' })
  @IsNotEmpty()
  @IsString()
  start_date!: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsNotEmpty()
  @IsString()
  end_date!: string;
}
