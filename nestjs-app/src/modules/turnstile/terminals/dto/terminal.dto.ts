// Terminal DTOs. Laravel: TerminalController validates building_id, name, ip_address.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIP, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QueryTerminalDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateTerminalDto {
  @ApiProperty() @IsInt() building_id!: number;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ru?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_en?: string;
  @ApiProperty() @IsIP(4) ip_address!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() server_ip?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() url?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() type?: boolean;
}

export class UpdateTerminalDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() building_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ru?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_en?: string;
  @ApiPropertyOptional() @IsOptional() @IsIP(4) ip_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() server_ip?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() url?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() type?: boolean;
}
