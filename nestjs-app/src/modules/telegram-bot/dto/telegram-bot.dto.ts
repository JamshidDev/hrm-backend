// Telegram bot DTO'lari. Laravel: TelegramCheckRequest, TelegramRegisterRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class TelegramCheckDto {
  @ApiProperty({ example: '995016004' })
  @IsString()
  @Length(9, 9)
  phone!: string;

  @ApiProperty({ example: '31308942720074' })
  @IsString()
  @Length(14, 14)
  pin!: string;
}

export class TelegramRegisterDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  uuid!: string;

  @ApiProperty({ example: 123456789 })
  @Type(() => Number)
  @IsInt()
  chat_id!: number;
}

export class TelegramServiceQueryDto {
  @ApiPropertyOptional({ example: 'md5hash' })
  @IsOptional()
  @IsString()
  service?: string;
}

export class TelegramSetServiceDto {
  @ApiPropertyOptional({ example: 'md5hash' })
  @IsOptional()
  @IsString()
  service?: string;
}
