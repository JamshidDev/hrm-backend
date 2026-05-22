// Chat news media DTO'lari.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class MediaListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({ description: 'Faqat shu news_id uchun' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chat_news_id?: number;
}

/**
 * POST /chat/media — multipart upload (file + metadata).
 * Laravel: file Multer orqali, MinIO'ga `chat-media/` folder'iga saqlanadi.
 * Allowed extensions: pdf, doc, docx, png, jpg, jpeg.
 */
export class CreateMediaDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chat_news_id!: number;

  @ApiProperty({ example: 'image', description: '`image`, `document`, ...' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ example: 1, description: 'Tartib raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;
}
