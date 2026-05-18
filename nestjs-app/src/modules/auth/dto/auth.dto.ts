import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

// ========== LOGIN ==========

export class LoginDto {
  @ApiProperty({ example: '995016004', minLength: 9, maxLength: 9 })
  @IsString()
  @Length(9, 9)
  @Matches(/^\d{9}$/, { message: 'phone must contain exactly 9 digits' })
  phone!: string;

  @ApiProperty({ example: 'Jamshid2@@@', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: '1229956|z6dvrpvVFICGVaF6qsnoDKNQLRDNWBkZqNAXOH4g21c2f78d',
  })
  access_token!: string;

  @ApiProperty({ example: 'Kirish muvaffaqqiyatli amalga oshirildi!' })
  message!: string;

  @ApiProperty({ example: false })
  must_change!: boolean;
}

// ========== OAUTH: GENERATE AUTH CODE ==========
// Laravel rules: client_id required string, state required string, scope required string

export class OAuthGenerateCodeDto {
  @ApiProperty({ example: 'hrm-frontend' })
  @IsString()
  client_id!: string;

  @ApiProperty({ example: 'random-state-string' })
  @IsString()
  state!: string;

  @ApiProperty({ example: 'profile email' })
  @IsString()
  scope!: string;
}

export class OAuthGenerateCodeResponseDto {
  @ApiProperty({
    example:
      'https://client.example.com/callback?code=abc&state=xyz&scope=profile',
  })
  url!: string;
}

// ========== OAUTH: EXCHANGE CODE → USER ==========
// Laravel rules: code required string, client_id required string, client_secret nullable string

export class OAuthCheckCodeDto {
  @ApiProperty({ example: 'auth-code-string-40-chars' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'hrm-frontend' })
  @IsString()
  client_id!: string;

  @ApiProperty({ example: 'client-secret', required: false })
  @IsOptional()
  @IsString()
  client_secret?: string;
}

export class OAuthCheckCodeUserDto {
  @ApiProperty({ example: 12260 })
  id!: number;

  @ApiProperty({ example: '0b5b3658-801b-425f-9811-10952e72ad21' })
  uuid!: string;

  @ApiProperty({ example: 995016004 })
  phone!: number;

  @ApiProperty({ example: null, nullable: true })
  phone_verified_at!: string | null;

  @ApiProperty({ example: false })
  is_verified!: boolean;

  @ApiProperty({ example: true })
  status!: boolean;

  @ApiProperty({ example: '2025-05-10T22:21:14.000000Z', nullable: true })
  created_at!: string | null;

  @ApiProperty({ example: '2026-05-01T15:34:55.000000Z', nullable: true })
  updated_at!: string | null;

  @ApiProperty({ example: null, nullable: true })
  deleted_at!: string | null;

  @ApiProperty({ example: 1, nullable: true })
  organization_id!: number | null;

  @ApiProperty({ example: 12703, nullable: true })
  worker_id!: number | null;

  @ApiProperty({ example: '2026-04-30 16:48:56', nullable: true })
  password_changed_at!: string | null;
}

export class OAuthCheckCodeResponseDto {
  @ApiProperty({ type: OAuthCheckCodeUserDto })
  user!: OAuthCheckCodeUserDto;
}
