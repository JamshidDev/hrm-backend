// Telegram bot modul DTO'lari (public endpointlar).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * POST /api/v1/economist/telegram/login
 * pin + chat_id majburiy. Bot-Token header'da.
 */
export class TelegramLoginDto {
  @ApiPropertyOptional({ description: 'Telefon raqami (Laravel`da ignor)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: '31606995940026',
    description: 'Xodim PIN (14 raqamli)',
  })
  @IsNotEmpty()
  @IsString()
  pin!: string;

  @ApiProperty({ example: 123456789, description: 'Telegram chat_id' })
  @Type(() => Number)
  @IsInt()
  chat_id!: number;

  @ApiPropertyOptional({ description: 'Bot token (header alternativa)' })
  @IsOptional()
  @IsString()
  bot_token?: string;
}

/**
 * GET /api/v1/economist/telegram/check-user?chat_id=
 */
export class TelegramCheckUserQueryDto {
  @ApiProperty({ example: 123456789 })
  @Type(() => Number)
  @IsInt()
  chat_id!: number;
}

/**
 * GET /api/v1/economist/telegram/months?uuid=
 */
export class TelegramMonthsQueryDto {
  @ApiProperty({ description: 'Worker UUID' })
  @IsUUID()
  uuid!: string;
}

/**
 * GET /api/v1/economist/telegram/salary?uuid=&year=&month=
 */
export class TelegramSalaryQueryDto {
  @ApiProperty({ description: 'Worker UUID' })
  @IsUUID()
  uuid!: string;

  @ApiPropertyOptional({ example: 2025 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year?: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
