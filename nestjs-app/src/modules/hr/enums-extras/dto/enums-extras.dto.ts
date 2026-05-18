// HR Enum extras query DTO. Laravel: HRController::{contractAdditionalTypes,getCommandTypes,getReasonTypes}.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ContractAdditionalTypesQueryDto {
  @ApiPropertyOptional({ description: 'ContractType id (filters subset)', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contract_type?: number;
}

export class CommandTypesQueryDto {
  @ApiPropertyOptional({
    description:
      'When `status = "contracts"` → getContractCommands($type). Otherwise: getCommandTypes($type).',
    example: 'contracts',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Type id (semantics depends on status).', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;
}

export class ReasonTypesQueryDto {
  @ApiPropertyOptional({ description: 'Command type id', example: 44 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;
}
