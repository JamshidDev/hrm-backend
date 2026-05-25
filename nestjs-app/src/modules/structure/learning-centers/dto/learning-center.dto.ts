// LearningCenter DTO'lari. Laravel: LMS/LearningCenterController + LearningCenterListResource.
// Endpoint: /api/v1/structure/learning-centers (LMS modul'idan, lekin route Structure prefix'ida).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

export class QueryLearningCenterDto extends SearchPaginationQueryDto {}

export class CreateLearningCenterDto {
  @ApiProperty({ example: "Toshkent o'quv markazi" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Учебный центр Ташкент' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_ru?: string;

  @ApiPropertyOptional({ example: 'Tashkent Training Center' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name_en?: string;

  @ApiProperty({ example: 'TASH001', maxLength: 7 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(7)
  code!: string;

  // Optional users[] to sync (M:M relation).
  @ApiPropertyOptional({ example: [12260], type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  users?: number[];
}

export class UpdateLearningCenterDto extends CreateLearningCenterDto {}

// ========== RESPONSE ==========

export class LearningCenterWorkerMinimalDto {
  @ApiProperty({ example: 12703 })
  id!: number;

  @ApiProperty({ example: 'https://s3.../photo.jpg', nullable: true })
  photo!: string | null;

  @ApiProperty({ example: 'Raximov', nullable: true })
  last_name!: string | null;

  @ApiProperty({ example: 'Jamshid', nullable: true })
  first_name!: string | null;

  @ApiProperty({ example: "Shuxrat o'g'li", nullable: true })
  middle_name!: string | null;
}

// LearningCenterUsersResource: {id (user.id), worker, phone, status (pivot)}
export class LearningCenterUserItemDto {
  @ApiProperty({ example: 12260 })
  id!: number;

  @ApiProperty({ type: LearningCenterWorkerMinimalDto, nullable: true })
  worker!: LearningCenterWorkerMinimalDto | null;

  @ApiProperty({ example: 995016004 })
  phone!: number | string;

  @ApiProperty({ example: true })
  status!: boolean;
}

export class LearningCenterItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ type: [LearningCenterUserItemDto] })
  users!: LearningCenterUserItemDto[];

  @ApiProperty({ example: 'TASH001', nullable: true })
  code!: string | null;

  @ApiProperty({ example: "Toshkent o'quv markazi" })
  name!: string;

  @ApiProperty({ example: 'Учебный центр Ташкент', nullable: true })
  name_ru!: string | null;

  @ApiProperty({ example: 'Tashkent Training Center', nullable: true })
  name_en!: string | null;
}

export class LearningCenterListResponseDto {
  @ApiProperty({ example: 1 })
  current_page!: number;

  @ApiProperty({ example: 10 })
  per_page!: number;

  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ type: [LearningCenterItemDto] })
  data!: LearningCenterItemDto[];
}
