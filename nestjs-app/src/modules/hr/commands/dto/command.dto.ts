// Command DTO'lari. Laravel: HR/CommandController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

// POST /api/v1/hr/commands
export class CreateCommandDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  command_type!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  director_id!: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  worker_position_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiProperty({ example: '2025-01-15' }) command_date!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() command_number?: string;
  @ApiPropertyOptional() @IsOptional() confirmations?: unknown[];
  @ApiPropertyOptional() @IsOptional() workers?: unknown[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() organization_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() base?: string;
  @ApiPropertyOptional() @IsOptional() reason?: unknown;
  @ApiPropertyOptional() @IsOptional() additional?: unknown;
}

// GET /api/v1/hr/worker-additional/{id}?type=...
export class CheckWorkerPositionAdditionalQueryDto {
  @ApiProperty({
    enum: [
      'pension_count',
      'pension_coefficient',
      'salary_withholding',
      'compensation',
      'financial_assistance',
    ],
    example: 'pension_count',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'pension_count',
    'pension_coefficient',
    'salary_withholding',
    'compensation',
    'financial_assistance',
  ])
  type!: string;
}

export class QueryCommandDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  confirmation?: number;
}

// ---------- Response ----------

export class CommandWorkerMinDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class CommandWorkerConfirmationDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: CommandWorkerMinDto, nullable: true })
  worker!: CommandWorkerMinDto | null;
  @ApiProperty({ nullable: true }) position!: string | null;
}

export class CommandOrganizationDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class CommandItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) command_number!: string | null;
  @ApiProperty({ nullable: true }) command_date!: string | null;
  @ApiProperty({ type: [CommandWorkerConfirmationDto] })
  workers!: CommandWorkerConfirmationDto[];
  @ApiProperty() type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) file!: string | null;
  @ApiProperty({ nullable: true }) confirmation_file!: string | null;
  @ApiProperty({ type: CommandOrganizationDto, nullable: true })
  organization!: CommandOrganizationDto | null;
  @ApiProperty() generate!: number;
  @ApiProperty({ nullable: true }) created_at!: string | null;
  @ApiProperty() confirmation!: { id: number; name: string };
}

export class CommandListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [CommandItemDto] }) data!: CommandItemDto[];
}
