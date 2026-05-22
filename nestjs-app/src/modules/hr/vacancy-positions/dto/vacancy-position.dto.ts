// VacancyPosition DTO. Laravel: HR/VacancyPositionController + VacancyApplication* + ZoomController.

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryVacancyPositionDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

export class CreateVacancyPositionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('department_positions', 'id')
  department_position_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  rate!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Exists('cities', 'id')
  city_id!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  experience!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  salary!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  work_type!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  education!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position_obligations?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualification_requirements?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() working_conditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialties?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() salary_status?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() phd_status?: boolean;
}

// Laravel UpdateVacancyPositionRequest: barcha maydonlar `sometimes` —
// partial body qabul qilinadi. `status` esa faqat update'da bor.
export class UpdateVacancyPositionDto extends PartialType(
  CreateVacancyPositionDto,
) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

export class UpdateApplicationStatusDto {
  @ApiProperty() @IsNotEmpty() status!: number;
}

export class CreateMeetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() topic?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() start_time?: string;
}

export class AttachExamDto {
  @ApiProperty() @Type(() => Number) @IsInt() exam_id!: number;
}

export class UpdateExamDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) score?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

// Laravel: 'type' => 'required|integer', 'file' => 'required|file' (multipart).
// `file` — @UploadedFile() orqali keladi, DTO'da emas.
export class UploadFileDto {
  @ApiProperty({
    example: 1,
    description: 'Ariza bosqichi turi (VacancyLevelEnum)',
  })
  @Type(() => Number)
  @IsInt()
  type!: number;
}
