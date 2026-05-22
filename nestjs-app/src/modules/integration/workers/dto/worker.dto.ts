// Integration workers DTO'lari.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsString } from 'class-validator';

export class WorkersByPinsDto {
  @ApiProperty({ example: [12345678, 87654321], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  pins!: number[];
}

export class WorkerByPinQueryDto {
  @ApiProperty({
    example: 12345678,
    description: 'Pin (majburiy, Laravel parity)',
  })
  @Type(() => Number)
  @IsInt()
  pin!: number;
}

export class WorkerUuidParamDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  workerUuid!: string;
}
