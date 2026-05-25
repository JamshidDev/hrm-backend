// Contract DTO'lari. Laravel: HR/ContractController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

// POST /api/v1/hr/contracts
export class CreateContractDto {
  @ApiProperty() @IsNotEmpty() number!: string | number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() contract_date?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;

  @ApiProperty({ description: 'ContractType id' })
  @Type(() => Number)
  @IsInt()
  type!: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() position_date?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('schedules', 'id')
  schedule_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('confirmation_workers', 'id')
  director_id!: number;

  @ApiProperty() @IsBoolean() command_status!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  command_type?: number;
  @ApiPropertyOptional() @IsOptional() probation?: number | string;
  @ApiPropertyOptional() @IsOptional() @IsString() post_name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) salary?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vacation_main_day?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  additional_vacation_day?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contract_to_date?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_position_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() command_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() command_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() confirmations?: unknown[];
  @ApiPropertyOptional() @IsOptional() group?: number | string;
  @ApiPropertyOptional() @IsOptional() rank?: number | string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) rate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position_status?: number;
  @ApiPropertyOptional() @IsOptional() table_number?: string | number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  temporary_worker_id?: number;
}

export class QueryContractDto extends SearchPaginationQueryDto {
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

export class ContractWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) uuid!: string | null;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
  @ApiProperty({ nullable: true }) birthday!: string | null;
  @ApiProperty({ nullable: true }) pin!: number | null;
}

export class ContractOrganizationDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class ContractItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) number!: string | null;
  @ApiProperty({ type: ContractWorkerDto, nullable: true })
  worker!: ContractWorkerDto | null;
  @ApiProperty({ type: ContractOrganizationDto, nullable: true })
  organization!: ContractOrganizationDto | null;
  @ApiProperty({ nullable: true }) file!: string | null;
  @ApiProperty({ nullable: true }) confirmation_file!: string | null;
  @ApiProperty({ nullable: true }) contract_date!: string | null;
  @ApiProperty() type!: { id: number; name: string };
  @ApiProperty() command_status!: { id: number; name: string };
  @ApiProperty() status!: { id: number; name: string };
  @ApiProperty() confirmation!: { id: number; name: string };
  @ApiProperty() generate!: number;
  @ApiProperty({ nullable: true }) created_at!: string | null;
  @ApiProperty({ nullable: true }) creator!: number | null;
}

export class ContractListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [ContractItemDto] }) data!: ContractItemDto[];
}
