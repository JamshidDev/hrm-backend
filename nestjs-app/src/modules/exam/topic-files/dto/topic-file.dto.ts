// Topic file DTO'lar. Laravel: Exam/TopicFileController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QueryTopicFileDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateTopicFileDto {
  @ApiProperty({ description: 'Display file name' })
  @IsString()
  @IsNotEmpty()
  file_name!: string;

  @ApiPropertyOptional({ description: 'Storage path or URL' })
  @IsOptional()
  @IsString()
  file?: string;

  @ApiPropertyOptional({ description: 'File extension (pdf, docx, ...)' })
  @IsOptional()
  @IsString()
  file_extension?: string;

  @ApiPropertyOptional({ description: 'File type code', default: 1 })
  @IsOptional()
  @IsInt()
  type?: number;

  @ApiPropertyOptional({ description: 'Active flag', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateTopicFileDto extends CreateTopicFileDto {}
