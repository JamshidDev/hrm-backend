// Admin Telegram DTO'lari. Laravel: TelegramController/TelegramPushController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class TelegramAccountsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({ example: '99501' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class TelegramUsersQueryDto extends TelegramAccountsQueryDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Faqat bugun tug`ilgan kunlari bo`lganlar',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  birthdays?: boolean;
}

export class TelegramDetachDto {
  @ApiProperty({ example: [123456789, 987654321], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  chat_ids!: number[];
}
