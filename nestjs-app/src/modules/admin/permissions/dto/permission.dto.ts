// Permission admin DTO'lari (Laravel: Http/Requests/Permission/* + PermissionResource).

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

// ========== REQUEST ==========

// Laravel rules: search nullable string max:255, per_page nullable integer min:1
export class QueryPermissionDto extends SearchPaginationQueryDto {}

// Laravel: name required string max:255 unique:permissions,name
export class CreatePermissionDto {
  @ApiProperty({ example: 'custom-permission', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

// Update — bir xil. Unique current id istisno (controller'da tekshiriladi)
export class UpdatePermissionDto {
  @ApiProperty({ example: 'custom-permission', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

// ========== RESPONSE (PermissionResource + PaginateResource) ==========

export class PermissionItemDto {
  @ApiProperty({ example: 891 })
  id!: number;

  @ApiProperty({ example: 'admin' })
  name!: string;
}

// PaginateResource format: { current_page, per_page, total, data }
export class PermissionListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 320 })
  total!: number;

  @ApiProperty({ type: [PermissionItemDto] })
  data!: PermissionItemDto[];
}
