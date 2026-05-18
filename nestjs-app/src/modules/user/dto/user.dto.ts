// User modul DTO'lari (response)
// Hozircha faqat profile response. Phase 2B'da: me, roles, notifications, update qo'shiladi.
//
// Laravel mapping:
//   - ProfileResponseDto ← UserResource (App\Http\Resources\User\UserResource)
//   - ProfileWorkerDto   ← WorkerUserResource (Modules\HR\Transformers\Worker\WorkerUserResource)
//   - ProfileOrganizationDto ← UserOrganizationResource
//   - ProfilePermissionDto ← PermissionResource
//   - ProfileRoleDto     ← Helper::userRoleAndPermissions natijasi

import { ApiProperty } from '@nestjs/swagger';

// ---- Sub-types ----

export class ProfileWorkerDto {
  @ApiProperty({ example: 12703 })
  id!: number;

  @ApiProperty({
    description: 'Signed MinIO URL valid for 30 minutes (or null if no photo)',
    example:
      'https://s3.example.com/bucket/worker-photos/abc.jpeg?X-Amz-Signature=...',
    nullable: true,
  })
  photo!: string | null;

  @ApiProperty({ example: 'Raximov', nullable: true })
  last_name!: string | null;

  @ApiProperty({ example: 'Jamshid', nullable: true })
  first_name!: string | null;

  @ApiProperty({ example: "Shuxrat o'g'li", nullable: true })
  middle_name!: string | null;
}

export class ProfileOrganizationDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '"O\'zbekiston temir yo\'llari" AJ', nullable: true })
  name!: string | null;
}

export class ProfilePermissionDto {
  @ApiProperty({ example: 891 })
  id!: number;

  @ApiProperty({ example: 'admin' })
  name!: string;
}

export class ProfileRoleDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Admin' })
  name!: string;

  @ApiProperty({ type: [ProfilePermissionDto] })
  permissions!: ProfilePermissionDto[];
}

// ---- Main response ----

export class ProfileResponseDto {
  @ApiProperty({ example: 12260 })
  id!: number;

  @ApiProperty({ example: '0b5b3658-801b-425f-9811-10952e72ad21' })
  uuid!: string;

  @ApiProperty({ type: ProfileWorkerDto, nullable: true })
  worker!: ProfileWorkerDto | null;

  @ApiProperty({ example: 995016004, description: 'Phone number as bigint' })
  phone!: number;

  @ApiProperty({ type: ProfileOrganizationDto, nullable: true })
  organization!: ProfileOrganizationDto | null;

  @ApiProperty({
    description:
      'Current organization role with merged permissions (role permissions + direct user permissions). ' +
      'Empty object {} if user has no role for this organization.',
    type: ProfileRoleDto,
  })
  role!: ProfileRoleDto | Record<string, never>;

  @ApiProperty({
    example: 1,
    description: 'Number of active Telegram accounts linked to the user',
  })
  telegram_account!: number;
}
