// Timesheet confirmations DTO/response shapes.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class AttachConfirmationItemDto {
  @ApiProperty({ description: 'confirmation_worker.id', example: 1 })
  @IsInt()
  id!: number;

  @ApiProperty({ description: 'Order in chain', example: 1 })
  @IsInt()
  order!: number;

  @ApiProperty({ description: 'Is main signer', example: false })
  @IsBoolean()
  main!: boolean;
}

export class AttachConfirmationsDto {
  @ApiProperty({ type: () => [AttachConfirmationItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttachConfirmationItemDto)
  confirmations!: AttachConfirmationItemDto[];
}

export class GetConfirmationsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  _placeholder?: number;
}

// ---- Response items ----

export interface ConfirmationStatusItem {
  id: number;
  name: string;
}

export interface ConfirmationTypeItem {
  id: number;
  name: string;
}

export interface ConfirmationWorkerInfo {
  id: number;
  uuid: string;
  photo: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birthday: string;
  pin: number | null;
}

export interface TimesheetConfirmationItem {
  id: number;
  status: ConfirmationStatusItem;
  order: number;
  worker: ConfirmationWorkerInfo | null;
  position: string | null;
  confirmation_type: ConfirmationTypeItem;
  main: boolean;
}

export interface GetConfirmationsResponse {
  confirmations: TimesheetConfirmationItem[];
}
