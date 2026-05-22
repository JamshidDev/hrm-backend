// Admin Deploy DTO'lari. Laravel: DeployIndexRequest/StoreRequest/UploadRequest/PublishRequest.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class DeployListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  per_page?: number;
}

export class DeployStoreDto {
  @ApiProperty({ example: 'Bug fix in auth' })
  @IsString()
  @IsNotEmpty()
  changes!: string;

  @ApiProperty({ example: '1.0.1' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class DeployUploadDto {
  @ApiPropertyOptional({ example: 'Frontend update v2' })
  @IsOptional()
  @IsString()
  changes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class DeployPublishDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  published!: boolean;
}
