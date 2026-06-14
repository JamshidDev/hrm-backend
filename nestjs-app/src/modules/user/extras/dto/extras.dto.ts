// User extras DTO'lari. Laravel: UserController qo'shimcha endpointlari.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

  // Laravel: parameter mavjudligi → search by data->>'title' / data->>'message'.
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;

  // Laravel: parameter MAVJUDLIGI yetarli (qiymat e'tiborga olinmaydi) — agar
  // `?count=...` kelsa, response sifatida faqat COUNT qaytariladi.
  @ApiPropertyOptional({
    description: 'parameter mavjudligi shart, qiymat ahamiyatsiz',
  })
  @IsOptional()
  count?: string | boolean;

  // Laravel: parameter mavjudligi → `whereNull('read_at')` (faqat o'qilmaganlar).
  @ApiPropertyOptional({ description: "mavjudligi → faqat o'qilmaganlar" })
  @IsOptional()
  read_at?: string | boolean;
}

export class MarkNotificationsDto {
  // Laravel: 'all' bo'lsa — barcha unread'larni mark-read. Aks holda 'ids' kerak.
  @ApiPropertyOptional() @IsOptional() all?: boolean;
  @ApiPropertyOptional({
    example: ['notif-uuid-1', 'notif-uuid-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}

export class OrganizationHrsQueryDto {
  // Laravel OrganizationHrsRequest — organization_id required.
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  organization_id!: number;
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

// Laravel UpdateOrganizationInfoRequest — command_address/city_id/address required.
export class UpdateOrganizationInfoDto {
  @ApiProperty({ example: 'Buyruq manzili' })
  @IsString()
  @IsNotEmpty()
  command_address!: string;

  @ApiProperty({ example: 92 })
  @Type(() => Number)
  @IsInt()
  city_id!: number;

  @ApiProperty({ example: 'Toshkent sh.' })
  @IsString()
  @IsNotEmpty()
  address!: string;
}

export class AccessForAdminDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  user_uuid!: string;
}
