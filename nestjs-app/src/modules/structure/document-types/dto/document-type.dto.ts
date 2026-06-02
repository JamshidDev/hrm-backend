// DocumentType (Contract / ContractAdditional / Command) DTO'lari.
// Bu 3 ta turdosh modul: contract-types, contract-additional-types, command-types.
//
// Bir xil pattern:
//   - organization_id, type (smallint), file (doc/docx)
//   - Resource: {id, type: {id, name (i18n enum)}, organization: OrganizationListResource}
//
// File upload (doc/docx) — hozircha alohida bosqich (store/update skip).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryDocumentTypeDto extends PaginationQueryDto {
  // Laravel QueryHelper::filterByOrganizations — organizations / organization_id query params.
  @ApiPropertyOptional({
    example: '1,2',
    description: 'Comma-separated organization IDs',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional({ example: 'name search' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

// ========== RESPONSE ==========

export class DocumentTypeEnumItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Mehnat shartnomasi (Nomuayyan)' })
  name!: string;
}

// OrganizationListResource — {id, name (localized), group}.
export class DocumentTypeOrganizationDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot nomi', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

export class DocumentTypeItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: DocumentTypeEnumItemDto })
  type!: DocumentTypeEnumItemDto;

  @ApiProperty({ type: DocumentTypeOrganizationDto, nullable: true })
  organization!: DocumentTypeOrganizationDto | null;
}

export class DocumentTypeListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ type: [DocumentTypeItemDto] })
  data!: DocumentTypeItemDto[];
}
