// OrganizationService DTO'lari. Laravel: OrganizationServiceController + Helper::organizationServices.
// OrganizationServiceEnum: 'e-signature' (E-imzo), 'sms-service' (Eskiz sms).
//
// Logika: response — har enum case uchun `{key, name, active}`. Mavjud bo'lmasa active=false.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryOrganizationServiceDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  organization_id!: number;
}

export class CreateOrganizationServiceDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;

  @ApiProperty({ example: 'e-signature', enum: ['e-signature', 'sms-service'] })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ========== RESPONSE ==========

// Har enum case uchun item — Helper::organizationServices() chiqaradi.
export class OrganizationServiceItemDto {
  @ApiProperty({ example: 'e-signature' })
  key!: string;

  @ApiProperty({ example: 'E-imzo' })
  name!: string;

  @ApiProperty({ example: true })
  active!: boolean;
}
