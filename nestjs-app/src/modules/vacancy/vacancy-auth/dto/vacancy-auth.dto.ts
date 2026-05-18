// Vacancy auth DTO'lar. Laravel: Vacancy/VacancyUserController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// POST /v1/vacancies/login — telefon + parol.
export class VacancyLoginDto {
  @ApiProperty({ description: 'Phone number (9 digits)', example: '901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'Password (min 8 chars)' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

// POST /v1/vacancies/token — OTP yuborish (ism-familiya bilan).
export class VacancyOtpDto {
  @ApiProperty({ description: 'Phone number (9 digits)', example: '901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({ description: 'Middle name' })
  @IsString()
  @IsNotEmpty()
  middle_name!: string;
}

// POST /v1/vacancies/register — OTP tasdiqlash + parol o'rnatish.
export class VacancyRegisterDto {
  @ApiProperty({ description: 'New password (min 8 chars)' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ description: 'OTP code received via SMS' })
  @IsString()
  @IsNotEmpty()
  otp!: string;

  @ApiProperty({ description: 'Registration token (vacancy_user uuid)' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

// PUT /v1/vacancies/profile/update — profil ma'lumotlarini yangilash.
export class VacancyUpdateDto {
  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Middle name' })
  @IsOptional()
  @IsString()
  middle_name?: string;

  @ApiPropertyOptional({ description: 'Birthday (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ description: 'Sex (false=male, true=female)' })
  @IsOptional()
  sex?: boolean;

  @ApiPropertyOptional({ description: 'Education enum id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  education?: number;

  @ApiPropertyOptional({ description: 'Country id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  country_id?: number;

  @ApiPropertyOptional({ description: 'City id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  city_id?: number;

  @ApiPropertyOptional({ description: 'Region id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  region_id?: number;

  @ApiPropertyOptional({ description: 'Current region id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  current_region_id?: number;

  @ApiPropertyOptional({ description: 'Current city id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  current_city_id?: number;

  @ApiPropertyOptional({ description: 'Nationality id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nationality_id?: number;

  @ApiPropertyOptional({ description: 'Marital status enum id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  marital_status?: number;

  @ApiPropertyOptional({ description: 'PIN (passport ID)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pin?: number;

  @ApiPropertyOptional({ description: 'Languages (comma-separated)' })
  @IsOptional()
  @IsString()
  languages?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;
}

// POST /v1/vacancies/profile/update-photo — base64 yoki path.
export class VacancyUpdatePhotoDto {
  @ApiProperty({ description: 'Photo (base64 or storage path)' })
  @IsString()
  @IsNotEmpty()
  photo!: string;
}
