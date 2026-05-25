// Pensioner DTO'lari. Laravel: HR/PensionerController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryPensionerDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizations?: string;

  // export=true — Excel eksport vazifasini boshlaydi.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  export?: string;
}

export class CreatePensionerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  worker_id?: number;
  @ApiProperty() @IsString() @IsNotEmpty() last_name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() first_name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() middle_name?: string;
  @ApiProperty() @IsBoolean() sex!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() passport?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  experience?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
  // Laravel prepareForValidation: telefon raqamidan ( ) belgilari olib tashlanadi
  // (phone ustuni varchar(9) — "(99)5016004" → "995016004").
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[()]/g, '') : value,
  )
  @IsString()
  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() afghan?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() invalid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() chernobyl?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() railway_title?: boolean;
}

export class UpdatePensionerDto extends CreatePensionerDto {}

// ---------- Response ----------

export class PensionerOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class PensionerItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
  @ApiProperty() sex!: boolean;
  @ApiProperty({ type: PensionerOrgDto, nullable: true })
  organization!: PensionerOrgDto | null;
  @ApiProperty({ nullable: true }) position!: string | null;
  @ApiProperty({ nullable: true }) pin!: number | null;
  @ApiProperty({ nullable: true }) address!: string | null;
  @ApiProperty({ nullable: true }) passport!: string | null;
  @ApiProperty() experience!: number;
  @ApiProperty({ nullable: true }) year!: number | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() afghan!: boolean;
  @ApiProperty() invalid!: boolean;
  @ApiProperty() chernobyl!: boolean;
  @ApiProperty() railway_title!: boolean;
}

export class PensionerListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [PensionerItemDto] }) data!: PensionerItemDto[];
}
