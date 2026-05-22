// AppInstruction DTO'lari. Laravel: AppInstructionController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class InstructionListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;

  @ApiPropertyOptional({ example: 'workers' })
  @IsOptional()
  @IsString()
  menu?: string;

  @ApiPropertyOptional({ example: 'create' })
  @IsOptional()
  @IsString()
  sub_menu?: string;
}

export class CreateInstructionDto {
  @ApiProperty({ example: 'workers' })
  @IsString()
  @IsNotEmpty()
  menu!: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  @IsNotEmpty()
  sub_menu!: string;

  @ApiProperty({ example: 'Xodim qo`shish' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Создать сотрудника' })
  @IsOptional()
  @IsString()
  title_ru?: string;

  @ApiPropertyOptional({ example: 'Create worker' })
  @IsOptional()
  @IsString()
  title_en?: string;

  @ApiProperty({ example: 'Yangi xodim qo`shish uchun ...' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({ example: 'Чтобы создать ...' })
  @IsOptional()
  @IsString()
  text_ru?: string;

  @ApiPropertyOptional({ example: 'To create ...' })
  @IsOptional()
  @IsString()
  text_en?: string;
}

export class UpdateInstructionDto {
  @ApiPropertyOptional({ example: 'workers' })
  @IsOptional()
  @IsString()
  menu?: string;

  @ApiPropertyOptional({ example: 'create' })
  @IsOptional()
  @IsString()
  sub_menu?: string;

  @ApiPropertyOptional({ example: 'Yangilangan sarlavha' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title_ru?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title_en?: string;

  @ApiPropertyOptional({ example: 'Yangilangan matn' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text_ru?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text_en?: string;
}

export class InstructionExportQueryDto {
  @ApiProperty({ example: 'workers' })
  @IsString()
  @IsNotEmpty()
  menu!: string;
}
