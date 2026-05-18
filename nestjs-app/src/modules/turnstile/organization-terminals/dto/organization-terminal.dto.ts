// OrganizationTerminal DTOs. Laravel: OrganizationTerminalController validates
// terminals[] (sometimes array), organization_id (exists).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class SyncOrganizationTerminalsDto {
  @ApiProperty() @IsInt() organization_id!: number;
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  terminals?: number[];
}
