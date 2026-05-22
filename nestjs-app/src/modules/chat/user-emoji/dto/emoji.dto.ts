// User emoji DTO'lari. Laravel: UserEmojiController.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Bitta emoji item.
 * Laravel `items.*.ts` — millisekunddagi timestamp (Asia/Tashkent timezone).
 */
export class EmojiItemDto {
  @ApiProperty({ example: 12260 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromUserId!: number;

  @ApiProperty({ example: 12261 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toUserId!: number;

  @ApiProperty({ example: '👍' })
  @IsString()
  @IsNotEmpty()
  emoji!: string;

  @ApiProperty({
    example: 1700000000000,
    description: 'Timestamp in milliseconds',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ts!: number;
}

/**
 * POST /chat/emoji — batch.
 * Laravel: socket-server-api middleware (mandatory).
 * Bizning Nest hozircha @Public() bilan, lekin allowlist'da bo'lishi mumkin.
 */
export class SendEmojiBatchDto {
  @ApiProperty({ type: [EmojiItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmojiItemDto)
  items!: EmojiItemDto[];
}
