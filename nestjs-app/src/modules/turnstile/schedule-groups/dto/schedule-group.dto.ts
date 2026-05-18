// Schedule group DTOs. Laravel: TurnstileScheduleGroupController.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class QueryScheduleGroupDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
}

export class QueryScheduleGroupWorkersDto extends QueryScheduleGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() group_id?: number;
}

export class UpdateScheduleGroupDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
}
