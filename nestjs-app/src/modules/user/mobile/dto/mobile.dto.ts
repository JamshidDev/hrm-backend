// User Mobile DTO'lari. Laravel: UserMobileController, MobileVersionController, MobileFaceCheckInOutController, MobileAuthController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Match } from '@/common/validators/match.validator';

export class MobileVersionCheckDto {
  @ApiProperty({ example: '1.2.3' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class UpdatePasswordDto {
  // Laravel UpdatePasswordRequest: old_password / new_password / new_password_confirmation.
  @ApiProperty({ example: 'oldpass' })
  @IsString()
  @IsNotEmpty()
  old_password!: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8)
  new_password!: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8)
  // Laravel: 'same:new_password'.
  @Match('new_password')
  new_password_confirmation!: string;
}

export class UpdateFcmDto {
  @ApiProperty({ example: 'fcm-token-xyz' })
  @IsString()
  @IsNotEmpty()
  fcm_token!: string;

  @ApiPropertyOptional({ example: 'device-uuid' })
  @IsOptional()
  @IsString()
  device_uuid?: string;
}

// Laravel MySchedulesRequest: worker_position_id required, year/month nullable.
export class MySchedulesQueryDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  worker_position_id!: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class TurnstileEventsQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsString()
  date_to?: string;
}

// Laravel SalaryRequest: year/month required integer.
export class SalaryQueryDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  year!: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  month!: number;
}

export class MonthStatQueryDto {
  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

export class MyResumeQueryDto {
  @ApiPropertyOptional({ example: 'pdf' })
  @IsOptional()
  @IsString()
  format?: string;
}

export class CheckLocationDto {
  @ApiProperty({ example: 41.3 })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 69.2 })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;
}

export class TurnstileStartLivenessDto {
  @ApiPropertyOptional({ example: 'device-uuid' })
  @IsOptional()
  @IsString()
  device_uuid?: string;
}
