// HikCentral AccessLevel DTOs.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryAccessLevelDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() organization_id?: number;
}

export class UpdateAccessLevelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  devices?: number[];
}

export class AttachAccessLevelToOrgDto {
  @ApiProperty() @IsInt() organization_id!: number;
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  access_level_ids?: number[];
}
