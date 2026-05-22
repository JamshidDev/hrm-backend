// Notification DTO'lari. Laravel: NotificationController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class NotificationListQueryDto {
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
}

/**
 * POST /notifications/send — bitta foydalanuvchiga.
 * Laravel: UserMessageNotification class orqali yuboradi (laravel notification system).
 */
export class SendNotificationDto {
  @ApiProperty({ example: 12260 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({ example: 'Yangi xabar' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'info', description: 'NotificationTypeEnum' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: 'Sizga yangi xabar keldi' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    example: 'info',
    enum: ['info', 'success', 'warning', 'error'],
  })
  @IsOptional()
  @IsString()
  alert?: string;

  @ApiPropertyOptional({ description: 'Custom action payload' })
  @IsOptional()
  action?: unknown;
}

/**
 * POST /notifications/send-batch — bir nechta foydalanuvchiga.
 * filter: { userIds: number[], all?: boolean, unCheck?: number[] }
 */
export class BatchFilterDto {
  @ApiProperty({ type: [Number], example: [12260, 12261] })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  userIds!: number[];

  @ApiPropertyOptional({
    description: '`true` bo`lsa, unCheck dagi user`lardan tashqari hamma',
  })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    description: 'all=true bo`lganda istisno qilinadigan',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  unCheck?: number[];
}

export class SendBatchNotificationDto {
  @ApiProperty({ type: BatchFilterDto })
  filter!: BatchFilterDto;

  @ApiProperty({ example: 'Hammaga eslatma' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Bugun ish kuni soat 10:00 da boshlanadi' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ example: 'info' })
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alert?: string;

  @ApiPropertyOptional()
  @IsOptional()
  action?: unknown;
}
