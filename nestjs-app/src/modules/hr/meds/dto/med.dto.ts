// Worker meds DTO. Laravel: HR/MedController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

// Laravel MedIndexRequest: per_page, search, status, departments, organizations.
// (organization_id qabul qilinmaydi.)
export class QueryMedDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() organizations?: string;

  @ApiPropertyOptional({ description: 'MedStatusEnum (1/2) bo\'yicha filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Vergul bilan ajratilgan department id lar' })
  @IsOptional()
  @IsString()
  departments?: string;
}

export class CreateMedDto {
  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  from!: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ description: 'MedStatusEnum (1=healthy, 2=unhealthy)' })
  @IsNotEmpty()
  status!: boolean | number | string;

  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('worker_positions', 'id')
  worker_position_id!: number;

  // file — `nullable, mimes` — multipart upload. NestJS'da `@UploadedFile` ishlatish kerak,
  // hozircha JSON body shape uchun string (URL) ham olamiz.
  @ApiPropertyOptional({ description: 'File path (or uploaded multipart)' })
  @IsOptional()
  @IsString()
  file?: string;
}

export class UpdateMedDto {
  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  from!: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;

  @ApiProperty() @IsNotEmpty() status!: boolean | number | string;

  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() file?: string;
}
