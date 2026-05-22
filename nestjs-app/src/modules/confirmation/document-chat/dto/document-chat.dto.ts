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

// Laravel: $request->model + $request->document_id.
export class ChatQueryDto {
  @ApiProperty() @IsString() @IsNotEmpty() model!: string;
  @ApiProperty() @Type(() => Number) @IsInt() document_id!: number;
}

export class ChatMessagesQueryDto {
  @ApiProperty() @IsString() @IsNotEmpty() model!: string;
  @ApiProperty() @Type(() => Number) @IsInt() document_id!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() user_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number;
}

export class SendMessageDto {
  @ApiProperty() @IsString() @IsNotEmpty() model!: string;
  @ApiProperty() @Type(() => Number) @IsInt() document_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() recipient_id!: number;
  @ApiProperty() @IsString() @IsNotEmpty() message!: string;
}

export class ReadMessageDto {
  @ApiProperty({ type: () => [Number] })
  @IsArray()
  message_ids!: number[];
}
