// Admin user management DTO'lari (Laravel: Http/Requests/AdminUser/* + Resource'lar).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
} from 'class-validator';
import {
  PaginationQueryDto,
  SearchPaginationQueryDto,
} from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

// ========== REQUEST ==========

export class QueryAdminUserDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({
    example: '1,2',
    description: 'Comma-separated organization IDs',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  role?: number;

  // Laravel'da AdminUser uchun max:1000 cheklov bor — qayta declare qilamiz.
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 1000, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(1000)
  declare per_page?: number;
}

export class QueryAdminUserDirectPermissionDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ example: 891 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  permission_id?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 1000, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(1000)
  declare per_page?: number;
}

export class BlockAdminUserDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  status!: boolean;
}

export class DetachAdminUserRoleDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Exists('roles', 'id')
  role_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;
}

export class AssignAdminUserRoleDto {
  @ApiProperty({ example: '0b5b3658-801b-425f-9811-10952e72ad21' })
  @IsUUID()
  @Exists('users', 'uuid')
  uuid!: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Exists('roles', 'id')
  role_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  organization_id!: number;
}

export class QueryAdminUserRoleDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 1000, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(1000)
  declare per_page?: number;
}

export class GenerateAdminUserTokenDto {
  @ApiProperty({ example: '0b5b3658-801b-425f-9811-10952e72ad21' })
  @IsUUID()
  user_uuid!: string;
}

export class CheckAdminUserTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiI...' })
  @IsString()
  token!: string;
}

export class AttachAdminUserPermissionDto {
  @ApiProperty({ example: [891, 892], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Exists('permissions', 'id', { each: true })
  permission_ids!: number[];
}

export class DetachAdminUserPermissionDto {
  @ApiProperty({ example: [891], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Exists('permissions', 'id', { each: true })
  permission_ids!: number[];
}

// ========== RESPONSE ==========

export class AdminWorkerInfoDto {
  @ApiProperty({ example: 12703 })
  id!: number;

  @ApiProperty({ example: 'https://...', nullable: true })
  photo!: string | null;

  @ApiProperty({ example: 'Raximov', nullable: true })
  last_name!: string | null;

  @ApiProperty({ example: 'Jamshid', nullable: true })
  first_name!: string | null;

  @ApiProperty({ example: "Shuxrat o'g'li", nullable: true })
  middle_name!: string | null;
}

export class AdminOrganizationInfoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Tashkilot nomi', nullable: true })
  name!: string | null;

  @ApiProperty({ example: false })
  group!: boolean;
}

export class AdminUserRoleItemDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Admin' })
  name!: string;
}

export class AdminUserItemDto {
  @ApiProperty({ example: 12260 })
  id!: number;

  @ApiProperty({ example: '0b5b3658-...' })
  uuid!: string;

  @ApiProperty({ type: AdminWorkerInfoDto, nullable: true })
  worker!: AdminWorkerInfoDto | null;

  @ApiProperty({ example: 995016004 })
  phone!: number;

  @ApiProperty({ example: '2026-04-30 16:48:56', nullable: true })
  password_changed_at!: string | null;

  @ApiProperty({ type: AdminOrganizationInfoDto, nullable: true })
  organization!: AdminOrganizationInfoDto | null;

  @ApiProperty({ example: true })
  status!: boolean;

  @ApiProperty({ example: 0 })
  permissions_count!: number;

  @ApiProperty({ type: [AdminUserRoleItemDto] })
  roles!: AdminUserRoleItemDto[];
}

export class AdminUserListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ type: [AdminUserItemDto] })
  data!: AdminUserItemDto[];
}

// Direct permissions list — Laravel: AdminUserDirectPermissionResource (alohida shaklda).
export class AdminUserDirectPermissionItemDto {
  @ApiProperty({ example: 12260 })
  id!: number;

  @ApiProperty({ example: '0b5b3658-...' })
  uuid!: string;

  @ApiProperty({ type: AdminWorkerInfoDto, nullable: true })
  worker!: AdminWorkerInfoDto | null;

  @ApiProperty({ example: 995016004 })
  phone!: number;

  @ApiProperty({ type: AdminOrganizationInfoDto, nullable: true })
  organization!: AdminOrganizationInfoDto | null;

  @ApiProperty({ example: true })
  status!: boolean;

  @ApiProperty({ type: [AdminUserRoleItemDto] })
  roles!: AdminUserRoleItemDto[];

  @ApiProperty({ type: [AdminUserRoleItemDto] })
  permissions!: AdminUserRoleItemDto[];
}

export class AdminUserDirectPermissionListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ type: [AdminUserDirectPermissionItemDto] })
  data!: AdminUserDirectPermissionItemDto[];
}
