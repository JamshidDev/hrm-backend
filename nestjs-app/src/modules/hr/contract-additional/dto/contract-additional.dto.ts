// ContractAdditional DTO'lari. Laravel: HR/ContractAdditionalController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

// POST /api/v1/hr/contract-additional
export class CreateContractAdditionalDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('worker_positions', 'id')
  worker_position_id!: number;

  @ApiProperty() @Type(() => Number) @IsInt() type!: number;
  @ApiProperty() @IsNotEmpty() number!: string | number;
  @ApiProperty({ example: '2025-01-15' }) @IsDateString() contract_date!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('confirmation_workers', 'id')
  director_id!: number;

  @ApiProperty() @IsNotEmpty() command_status!: number | string | boolean;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() organization_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() probation?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() post_name?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) salary?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() vacation_main_day?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() additional_vacation_day?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() department_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() contract_to_date?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() department_position_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() position_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() command_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() confirmations?: unknown[];
  @ApiPropertyOptional() @IsOptional() group?: number | string;
  @ApiPropertyOptional() @IsOptional() rank?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) rate?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() position_status?: number;
  @ApiPropertyOptional() @IsOptional() table_number?: number | string;
  @ApiPropertyOptional() @IsOptional() @IsString() command_number?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() temporary_worker_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() worker_id?: number;
}

export class QueryContractAdditionalDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;
}

// ---------- Response ----------

export class ContractAdditionalWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) uuid!: string | null;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
  @ApiProperty({ nullable: true }) birthday!: string | null;
  @ApiProperty({ nullable: true }) pin!: number | null;
}

export class ContractAdditionalOrganizationDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class ContractAdditionalItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) number!: number | null;
  @ApiProperty({ type: ContractAdditionalWorkerDto, nullable: true })
  worker!: ContractAdditionalWorkerDto | null;
  @ApiProperty({ type: ContractAdditionalOrganizationDto, nullable: true })
  organization!: ContractAdditionalOrganizationDto | null;
  @ApiProperty({ nullable: true }) file!: string | null;
  @ApiProperty({ nullable: true }) confirmation_file!: string | null;
  @ApiProperty({ nullable: true }) contract_date!: string | null;
  @ApiProperty({ nullable: true }) contract_to_date!: string | null;
  @ApiProperty() type!: { id: number; name: string };
  @ApiProperty() command_status!: { id: number; name: string };
  @ApiProperty() generate!: number;
  @ApiProperty({ nullable: true }) created_at!: string | null;
  @ApiProperty() confirmation!: { id: number; name: string };
}

export class ContractAdditionalListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [ContractAdditionalItemDto] })
  data!: ContractAdditionalItemDto[];
}
