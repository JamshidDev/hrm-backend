// Document DTO. Laravel: Confirmation/DocumentController + DocumentConfirmationController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class DocumentQueryDto {
  @ApiProperty({ description: 'Model type (e.g. contracts, commands)' })
  @IsString()
  @IsNotEmpty()
  model_type!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  model_id!: number;
}

export class DocumentSignatureDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() signature?: string;
}

export class ForwardConfirmationDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() confirmation_id!: number;
}

export class DocumentBase64QueryDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
}

export class DocumentUpdateDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
}

export class GenerateConfirmationUrlDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
}

export class DocumentConfirmDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() status!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}
