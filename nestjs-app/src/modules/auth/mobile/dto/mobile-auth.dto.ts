// Mobile Auth DTO'lari. Laravel: MobileLoginRequest, MobileRefreshRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class MobileLoginDto {
  @ApiProperty({ example: '995016004' })
  @IsString()
  @Length(9, 9)
  phone!: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: 'iPhone 15' })
  @IsString()
  @IsNotEmpty()
  device_model!: string;

  @ApiProperty({ example: 'ios' })
  @IsString()
  @IsNotEmpty()
  platform!: string;

  @ApiProperty({ example: 'password', enum: ['password', 'face'] })
  @IsIn(['password', 'face'])
  login_type!: 'password' | 'face';

  @ApiPropertyOptional({ example: 'base64-photo-data' })
  @IsOptional()
  @IsString()
  photo?: string;
}

export class MobileRefreshDto {
  @ApiPropertyOptional({ example: 'refresh-token-xyz' })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
