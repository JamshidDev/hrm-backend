// User extras DTO'lari. Laravel: UserController qo'shimcha endpointlari.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class NotificationsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;
}

export class MarkNotificationsDto {
  @ApiProperty({ example: ['notif-uuid-1', 'notif-uuid-2'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}

export class OrganizationHrsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

export class ChangeCurrentOrganizationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  organization_id!: number;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '995016004' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'newPassword' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateOrganizationInfoDto {
  @ApiProperty({ example: 'Updated org name' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class AccessForAdminDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  user_uuid!: string;
}
