// Command DTO'lari. Laravel: HR/CommandController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  worker_position_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;

  // MUHIM: validator dekoratori bo'lishi shart — aks holda `whitelist: true`
  // bu maydonni request'dan olib tashlaydi (command_date null bo'lib qolardi).
  @ApiProperty({ example: '2025-01-15' })
  @IsString()
  @IsNotEmpty()
  command_date!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() command_number?: string;
  @ApiPropertyOptional() @IsOptional() confirmations?: unknown[];
  @ApiPropertyOptional() @IsOptional() workers?: unknown[];
  // Ko'p ishchili (many-worker) buyruqlar uchun (41,55,61,62,71,72,73).
  @ApiPropertyOptional() @IsOptional() worker_positions?: unknown[];
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() base?: string;
  @ApiPropertyOptional() @IsOptional() reason?: unknown;
  @ApiPropertyOptional() @IsOptional() additional?: unknown;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  finance_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() contract_to_date?: string;
  @ApiPropertyOptional() @IsOptional() command_additional?: unknown;

  // --- Create-type (1–8) maydonlari (Laravel handleCreateType) ---
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  worker_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  department_position_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  position_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  probation?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() position_date?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  group?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  rank?: number;
  // salary/rate — son yoki satr kelishi mumkin (Laravel raw qiymat).
  @ApiPropertyOptional() @IsOptional() salary?: number | string;
  @ApiPropertyOptional() @IsOptional() rate?: number | string;
  // contract raqami — Laravel `data['number']` (command_number EMAS).
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contract_date?: string;
  // Tip 6 (vaqtinchalik o'rinbosar) uchun.
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  temporary_worker_id?: number;

  // --- Single-worker vacation (43–54) maydonlari ---
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() work_day?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() new_date?: string;
  @ApiPropertyOptional() @IsOptional() rest_day?: number | string;
  @ApiPropertyOptional() @IsOptional() all_day?: number | string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  vacation_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  vacation_finish_status?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  vacation_status?: number;
  @ApiPropertyOptional() @IsOptional() child_age?: number | string;
  @ApiPropertyOptional() @IsOptional() half_one_day?: number | string;
  @ApiPropertyOptional() @IsOptional() half_one_base?: unknown;
  @ApiPropertyOptional() @IsOptional() half_two_day?: number | string;
  @ApiPropertyOptional() @IsOptional() half_two_base?: unknown;
  @ApiPropertyOptional() @IsOptional() @IsString() half_two_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vacation_reason_type?: string;
  @ApiPropertyOptional() @IsOptional() vacation_reason_day?: number | string;
  @ApiPropertyOptional() @IsOptional() @IsString() period_from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() period_to?: string;
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
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
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
  @ApiProperty() total!: number;
  @ApiProperty({ type: [CommandItemDto] }) data!: CommandItemDto[];
}
