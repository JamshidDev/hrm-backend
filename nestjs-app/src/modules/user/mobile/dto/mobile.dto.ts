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
} from 'class-validator';

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
  @ApiProperty({ example: 'oldpass' })
  @IsString()
  @IsNotEmpty()
  current_password!: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @IsNotEmpty()
  new_password!: string;
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

export class MySchedulesQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsString()
  end_date?: string;
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

export class SalaryQueryDto {
  @ApiProperty({ example: '2026-05' })
  @IsString()
  @IsNotEmpty()
  month!: string;
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
