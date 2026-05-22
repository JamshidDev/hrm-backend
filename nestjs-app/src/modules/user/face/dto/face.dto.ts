// User Face DTO'lari. Laravel: FaceRecognitionRequest, socket endpoints.

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class FaceRecognitionDto {
  @ApiProperty({ example: 'base64-photo-data' })
  @IsString()
  @IsNotEmpty()
  photo!: string;
}

export class UpdateUserPhotosDto {
  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  user_ids!: number[];
}
