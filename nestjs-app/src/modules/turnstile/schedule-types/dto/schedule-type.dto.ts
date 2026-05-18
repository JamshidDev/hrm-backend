// Turnstile schedule type DTOs. Laravel: TurnstileScheduleTypeController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QueryScheduleTypeDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
}

export class CreateScheduleTypeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsInt() type!: number;
  @ApiProperty({ type: [Object] }) @IsArray() days!: unknown[];
}

export class UpdateScheduleTypeDto extends CreateScheduleTypeDto {}
