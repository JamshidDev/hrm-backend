// Laravel SendResultRequest: result required|integer.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class SendResultDto {
  @ApiProperty({ example: 3280 })
  @Type(() => Number)
  @IsInt()
  result!: number;
}
