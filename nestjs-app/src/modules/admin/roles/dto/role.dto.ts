// Role admin DTO'lari (Laravel: Http/Requests/Role/* + RoleResource).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

// ========== REQUEST ==========

// Laravel: search nullable string max:255, per_page nullable integer min:1
export class QueryRoleDto extends SearchPaginationQueryDto {}

// Laravel: name required string max:255 unique:roles, permissions nullable array, permissions.* integer distinct exists:permissions,id
export class CreateRoleDto {
  @ApiProperty({ example: 'CustomRole', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: [891, 892], type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissions?: number[];
}

// Update — store bilan bir xil, lekin name unique ignoring current id (controller'da tekshiriladi)
export class UpdateRoleDto {
  @ApiProperty({ example: 'CustomRole', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: [891, 892], type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissions?: number[];
}

// ========== RESPONSE (RoleResource + PaginateResource) ==========

export class RolePermissionItemDto {
  @ApiProperty({ example: 891 })
  id!: number;

  @ApiProperty({ example: 'admin' })
  name!: string;
}

export class RoleItemDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Admin' })
  name!: string;

  @ApiProperty({ type: [RolePermissionItemDto] })
  permissions!: RolePermissionItemDto[];
}

// PaginateResource format: { current_page, per_page, total, data }
export class RoleListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 26 })
  total!: number;

  @ApiProperty({ type: [RoleItemDto] })
  data!: RoleItemDto[];
}
