// Worker DTO'lari. Laravel: StoreWorkerRequest, UpdateWorkerRequest, WorkerDTO.
//
// Endpointlar:
//   - GET /api/v1/hr/check-worker?pin=...  → WorkerWithPositionResource
//   - POST /api/v1/hr/workers              → store (WorkerInfoResource qaytaradi)
//   - PUT  /api/v1/hr/workers/{id}         → update

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

// ---------- Query ----------

export class CheckWorkerQueryDto {
  // Laravel: 'pin' => 'required|max:14|min:14' (string rule YO'Q).
  @ApiProperty({ example: '12345678901234' })
  @IsNotEmpty()
  @MaxLength(14)
  @MinLength(14)
  pin!: string;
}

// ---------- Mutations ----------

export class CreateWorkerDto {
  @ApiProperty({ example: 'Otabek' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({ example: 'Karimov' })
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiPropertyOptional({ example: "Akram o'g'li" })
  @IsOptional()
  @IsString()
  middle_name?: string;

  @ApiProperty({ example: '1990-01-15' })
  @IsDateString()
  birthday!: string;

  @ApiProperty({ example: 1, description: '0 — F, 1 — M' })
  @Type(() => Number)
  @IsInt()
  sex!: number;

  @ApiProperty({ example: 1, description: 'MaritalStatusEnum 1..3' })
  @Type(() => Number)
  @IsInt()
  marital_status!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('countries', 'id')
  country_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('regions', 'id')
  region_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('cities', 'id')
  city_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('regions', 'id')
  current_region_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('cities', 'id')
  current_city_id!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('nationalities', 'id')
  nationality_id!: number;

  @ApiPropertyOptional({ example: 'Address text' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: ['998900000000'] })
  @IsOptional()
  @IsArray()
  phones?: string[];

  @ApiPropertyOptional({ example: '5' })
  @IsOptional()
  @IsString()
  work_experience?: string;

  @ApiPropertyOptional({ example: '2020-01-01' })
  @IsOptional()
  @IsDateString()
  experience_date?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  education?: number;

  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ example: '998900000000' })
  @IsOptional()
  @IsString()
  user_phone?: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded photos array',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @Type(() => WorkerPhotoUploadDto)
  photos?: WorkerPhotoUploadDto[];

  // Passport fieldlari — Laravel'da StoreWorkerRequest qabul qilmaydi (bug).
  // NestJS qo'shimcha qilib qabul qiladi va worker_passports ga yozadi.
  @ApiPropertyOptional({ example: 'AD 4234234' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({
    description: 'Date string yoki epoch ms',
    example: 1777575600000,
  })
  @IsOptional()
  from_date?: string | number;

  @ApiPropertyOptional({
    description: 'Date string yoki epoch ms',
    example: 1780081200000,
  })
  @IsOptional()
  to_date?: string | number;

  @ApiPropertyOptional({ example: 'Xorazm IIB' })
  @IsOptional()
  @IsString()
  passport_address?: string;
}

export class WorkerPhotoUploadDto {
  @ApiProperty({ description: 'Base64-encoded image (data URI or raw)' })
  @IsString()
  @IsNotEmpty()
  photo!: string;

  @ApiProperty({ description: 'Mark this as current avatar' })
  @IsBoolean()
  current!: boolean;
}

export class UpdateWorkerDto extends CreateWorkerDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  update_password?: boolean;
}

// ---------- Response ----------

// WorkerInfoResource: id, uuid, photo (URL), last/first/middle_name, birthday, pin.
export class WorkerInfoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'b8c0a9...' })
  uuid!: string;

  @ApiProperty({ example: 'https://minio.../path', nullable: true })
  photo!: string | null;

  @ApiProperty({ example: 'Karimov', nullable: true })
  last_name!: string | null;

  @ApiProperty({ example: 'Otabek', nullable: true })
  first_name!: string | null;

  @ApiProperty({ example: "Akram o'g'li", nullable: true })
  middle_name!: string | null;

  @ApiProperty({ example: '1990-01-15' })
  birthday!: string;

  @ApiProperty({ example: '12345678901234', nullable: true })
  pin!: string | null;
}

// WorkerWithPositionResource — id, uuid, photo, names, birthday, positions[].
export class WorkerPositionMinDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Asosiy', nullable: true })
  type!: string | null;

  @ApiProperty({ example: '"O\'zbekiston temir yo\'llari" AJ', nullable: true })
  organization!: string | null;

  @ApiProperty({ example: 'Boshliq', nullable: true })
  position!: string | null;

  @ApiProperty({ example: 'Boshqaruv', nullable: true })
  department!: string | null;

  @ApiProperty({ example: '2020-01-01', nullable: true })
  position_date!: string | null;

  @ApiProperty({ example: null, nullable: true })
  hrs!: unknown | null;
}

export class WorkerWithPositionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'b8c0a9...' })
  uuid!: string;

  @ApiProperty({ example: 'https://minio.../path', nullable: true })
  photo!: string | null;

  @ApiProperty({ example: 'Karimov', nullable: true })
  last_name!: string | null;

  @ApiProperty({ example: 'Otabek', nullable: true })
  first_name!: string | null;

  @ApiProperty({ example: "Akram o'g'li", nullable: true })
  middle_name!: string | null;

  @ApiProperty({ example: '1990-01-15' })
  birthday!: string;

  @ApiProperty({ type: [WorkerPositionMinDto] })
  positions!: WorkerPositionMinDto[];
}
