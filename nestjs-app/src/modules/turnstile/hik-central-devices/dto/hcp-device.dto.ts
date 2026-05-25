// HCP Device DTOs. Laravel: HikCentralController (storeDevice, updateDevice, deleteDevice).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsIP, IsOptional, IsString } from 'class-validator';

export class QueryHcpDeviceDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizations?: string; // comma-sep
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string; // 'on' | 'off'
  @ApiPropertyOptional() @IsOptional() @IsString() org_status?: string; // 'yes' | 'no'
  @ApiPropertyOptional() @IsOptional() @IsString() attached?: string; // 'yes' | 'no'
}

export class CreateHcpDeviceDto {
  @ApiProperty() @IsInt() organization_id!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() device_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() device_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsIP(4) ip_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mac_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() config?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() log?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() upload_workers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() contract_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contract_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() price?: string;
}

export class UpdateHcpDeviceDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() device_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() device_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsIP(4) ip_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mac_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() config?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() log?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() upload_workers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() contract_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contract_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() price?: string;
}
