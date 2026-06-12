// Worker salary DTO'lari. Laravel: GetStatementRequest (uuid/year/month),
// GetStatementMonthRequest (uuid).

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class WorkerSalaryDto {
  @ApiProperty({ example: '0b5b3658-801b-425f-9811-10952e72ad21' })
  @IsString()
  @Exists('workers', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class WorkerSalaryMonthsDto {
  @ApiProperty({ example: '0b5b3658-801b-425f-9811-10952e72ad21' })
  @IsString()
  @Exists('workers', 'uuid')
  uuid!: string;
}
