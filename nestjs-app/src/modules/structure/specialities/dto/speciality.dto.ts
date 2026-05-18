// Speciality DTO'lari. Laravel: SpecialityController + SpecialityResource.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QuerySpecialityDto extends SearchPaginationQueryDto {}

export class CreateSpecialityDto {
  @ApiProperty({ example: 'Dasturlash injineriyasi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Программная инженерия' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;
}

export class UpdateSpecialityDto extends CreateSpecialityDto {}

// Response — Laravel SpecialityResource: { id, name, name_ru }
export class SpecialityItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Dasturlash injineriyasi' })
  name!: string;

  @ApiProperty({ example: 'Программная инженерия', nullable: true })
  name_ru!: string | null;
}

export class SpecialityListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [SpecialityItemDto] })
  data!: SpecialityItemDto[];
}
