// Document chat DTO. Laravel: Confirmation/DocumentChatController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ChatQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() model_type?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() model_id?: number;
}

export class ChatMessagesQueryDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() recipient_id?: number;
}

export class SendMessageDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() recipient_id!: number;
  @ApiProperty() @IsString() @IsNotEmpty() message!: string;
}

export class ReadMessageDto {
  @ApiProperty({ type: () => [Number] })
  @IsArray()
  message_ids!: number[];
}
