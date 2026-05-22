// Auth Liveness DTO'lari. Laravel: StartLivenessRequest, ValidateLivenessRequest, CompleteLivenessRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartLivenessDto {
  @ApiProperty({ example: '995016004' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class ValidateLivenessDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  session_id!: string;
}

export class CompleteLivenessDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  session_id!: string;

  @ApiPropertyOptional({ example: 'base64-ref-image' })
  @IsOptional()
  @IsString()
  refImage?: string;

  @ApiPropertyOptional({ example: 'base64-live-image' })
  @IsOptional()
  @IsString()
  liveImage?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  success?: boolean;
}
