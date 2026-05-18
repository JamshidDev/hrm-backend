// Nationality DTO'lari. Laravel: HR/NationalityController + NationalityResource.

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryNationalityDto extends SearchPaginationQueryDto {}

// Laravel rules: `name: string` — Laravel'da `required` ham yo'q (kichkina bug),
// lekin biz validation'da bo'sh string'ni rad qilamiz.
export class CreateNationalityDto {
  @ApiProperty({ example: 'Uzbek' })
  @IsString()
  @MaxLength(50)
  name!: string;
}

export class UpdateNationalityDto extends CreateNationalityDto {}

// Response: {id, name} — Laravel NationalityResource.
export class NationalityItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Uzbek' })
  name!: string;
}

export class NationalityListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 20 })
  total!: number;

  @ApiProperty({ type: [NationalityItemDto] })
  data!: NationalityItemDto[];
}
