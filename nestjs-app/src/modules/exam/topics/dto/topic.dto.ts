// Topic DTO'lar. Laravel: Exam/TopicController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QueryTopicDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (default: 10)' })
  @IsOptional()
  per_page?: number;

  @ApiPropertyOptional({ description: 'Search topic name (alias)' })
  @IsOptional()
  @IsString()
  search?: string;

  // Laravel `Topic::scopeSearch` `request('name')` ni qabul qiladi.
  @ApiPropertyOptional({ description: 'Topic name LIKE filter' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateTopicDto {
  @ApiProperty({ description: 'Topic name', example: 'Safety rules' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Topic type (1=internal, 2=external)',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  type?: number;

  @ApiPropertyOptional({ description: 'Organization id (optional)' })
  @IsOptional()
  @IsInt()
  organization_id?: number;
}

export class UpdateTopicDto extends CreateTopicDto {}
