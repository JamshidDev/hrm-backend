// OrganizationPhone DTO. Laravel: HR (routes), Structure/OrganizationPhoneController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryOrganizationPhoneDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

export class CreateOrganizationPhoneDto {
  @ApiProperty({ type: () => [String] })
  @IsArray()
  @ArrayMinSize(1)
  phones!: (string | number)[];
}

export class UpdateOrganizationPhoneDto {
  @ApiProperty({ example: '998901234567' })
  @IsNotEmpty()
  phone!: string | number;
}
