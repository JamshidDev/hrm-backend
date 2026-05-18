// OrganizationDocument DTO'lari. Laravel: HR/OrganizationDocumentController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryOrganizationDocumentDto extends SearchPaginationQueryDto {}

export class CreateOrganizationDocumentDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() type!: number;
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ['OWN', 'ALL'] })
  @IsOptional()
  @IsString()
  visibility_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() document_date?: string;
  @ApiPropertyOptional({ description: 'Base64 file (or already-uploaded path)' })
  @IsOptional()
  @IsString()
  file?: string;
}

export class UpdateOrganizationDocumentDto extends CreateOrganizationDocumentDto {}

// ---------- Response ----------

export class OrgDocumentOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class OrganizationDocumentItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: OrgDocumentOrgDto, nullable: true })
  organization!: OrgDocumentOrgDto | null;
  @ApiProperty({ nullable: true }) file!: string | null;
  @ApiProperty({ nullable: true }) title!: string | null;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() type!: { id: number; name: string };
  @ApiProperty() visibility_type!: string;
  @ApiProperty({ nullable: true }) document_date!: string | null;
}

export class OrganizationDocumentListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [OrganizationDocumentItemDto] })
  data!: OrganizationDocumentItemDto[];
}
