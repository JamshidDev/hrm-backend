// Topic file DTO'lar. Laravel: Exam/TopicFileController.
// POST/PUT multipart — frontend `active` + `file` (binary) yuboradi.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryTopicFileDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

// Laravel `StoreTopicFileRequest`: { active: required, file: required|file }.
// `active` form-data string ('0' / '1' / 'true' / 'false') ko'rinishida kelishi mumkin.
export class CreateTopicFileDto {
  @ApiPropertyOptional({ description: 'Active flag (form-data string yoki boolean)' })
  @IsOptional()
  active?: unknown;
}

// Laravel `UpdateTopicFileRequest`: file optional, active required.
export class UpdateTopicFileDto {
  @ApiPropertyOptional({ description: 'Active flag (form-data string yoki boolean)' })
  @IsOptional()
  active?: unknown;
}
