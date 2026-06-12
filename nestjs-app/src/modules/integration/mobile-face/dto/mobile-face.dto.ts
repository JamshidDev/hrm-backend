// Mobile-face DTO'lari. Laravel: CheckWorkerRequest, WorkerSchedulesRequest, SendEventRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

// Laravel: pin required|string|max:14|min:14|exists:workers,pin.
export class MobileFaceCheckWorkerDto {
  @ApiProperty({ example: '12345678901234' })
  @IsString()
  @Length(14, 14)
  @Exists('workers', 'pin')
  pin!: string;
}

// Laravel: year/month required integer, pin required|integer|digits:14.
export class MobileFaceSchedulesDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2010)
  @Max(2030)
  year!: number;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: '12345678901234' })
  @IsString()
  @Matches(/^\d{14}$/)
  pin!: string;
}

// Laravel SendEventRequest.
export class MobileFaceSendEventDto {
  @ApiProperty({ example: '2026-05-08 09:00:00' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  event_date_and_time!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  event_type!: boolean;

  @ApiProperty({ example: '12345678901234' })
  @IsString()
  @Matches(/^\d{14}$/)
  pin!: string;

  @ApiProperty({ example: 41.3 })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 69.2 })
  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photo?: string | null;

  @ApiProperty({ example: 'My Organization' })
  @IsString()
  organization!: string;
}
