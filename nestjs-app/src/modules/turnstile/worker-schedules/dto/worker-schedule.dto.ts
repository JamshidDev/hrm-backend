// Worker-schedule DTO'lari. Laravel: TurnstileWorkerScheduleGenerateController.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

// Laravel TurnstileDayInMonthRequest:
//   year  => required|integer|min:2010|max:2030
//   month => required|integer|min:1|max:12
export class DayInMonthQueryDto {
  @ApiProperty({ example: 2026 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 6 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
