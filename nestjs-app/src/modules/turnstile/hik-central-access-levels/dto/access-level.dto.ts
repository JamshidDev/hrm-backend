// HikCentral AccessLevel DTOs.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryAccessLevelDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() organization_id?: number;
}

// Laravel HikCentralAccessLevelUpdateRequest — ikkalasi ham required.
export class UpdateAccessLevelDto {
  @ApiProperty({ example: 24 })
  @IsInt()
  hik_central_department_id!: number;

  @ApiProperty({ type: [Number], example: [1841, 1840] })
  @IsArray()
  devices!: number[];
}

export class AttachAccessLevelToOrgDto {
  // Laravel body: { organization_id, access_levels: [...] } — sync($data['access_levels']).
  @ApiProperty() @IsInt() organization_id!: number;
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  access_levels?: number[];
}
