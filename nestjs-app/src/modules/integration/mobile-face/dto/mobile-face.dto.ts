// Mobile-face DTO'lari. Laravel: CheckWorkerRequest, WorkerSchedulesRequest, SendEventRequest.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';
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
