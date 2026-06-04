// Document DTO. Laravel: Confirmation/DocumentController + DocumentConfirmationController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// OnlyOffice frontend callbackUrl'ida `file_url` query qiymati encode qilinmaydi,
// shuning uchun uning ichidagi `?expires=&model=&signature=` top-level query'ga
// "oqib" o'tadi → `model` 2 marta keladi → Express uni massiv qiladi. Laravel
// takroriy query'da oxirgisini oladi; biz ham massivdan oxirgi qiymatni olamiz.
const lastIfArray = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value) ? value[value.length - 1] : value;

// Laravel: $request->model + $request->document_id (show / history / base64).
export class DocumentQueryDto {
  @ApiProperty({ description: 'Model (e.g. contracts, commands)' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  document_id!: number;
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

// OnlyOffice Document Server callback BODY. Laravel: DocumentEditorCallbackService.
// status: 1=editing, 2=ready to save, 3=save error, 4=closed no changes,
//         6=force save, 7=force save error.
export class DocumentUpdateDto {
  @ApiPropertyOptional({ description: 'OnlyOffice document key' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({ example: 2, description: 'OnlyOffice callback status' })
  @Type(() => Number)
  @IsInt()
  status!: number;

  @ApiPropertyOptional({ description: 'Tahrirlangan fayl URL (status 2/6)' })
  @IsOptional()
  @IsString()
  url?: string;
}

// OnlyOffice callback URL'iga frontend qo'shadigan query parametrlar.
export class DocumentUpdateQueryDto {
  @ApiProperty({ description: 'Model (contracts, commands, ...)' })
  @Transform(lastIfArray)
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 1 })
  @Transform(lastIfArray)
  @Type(() => Number)
  @IsInt()
  document_id!: number;

  @ApiPropertyOptional({ description: 'Asl fayl URL (path basename uchun)' })
  @IsOptional()
  @IsString()
  file_url?: string;
}

// GET /api/v1/document/generate-url?model=&confirmation_id=
// Laravel: DocumentConfirmationController::generateConfirmationUrl validatsiyasi.
export class GenerateConfirmationUrlDto {
  @ApiProperty({ description: 'Model (contracts, commands, ...)' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 286309 })
  @Type(() => Number)
  @IsInt()
  confirmation_id!: number;
}

// POST /api/v1/document/signature?token=  — token orqali imzolash/tekshirish.
// Laravel: DocumentConfirmationController::signature (signWithToken).
export class DocumentSignTokenDto {
  @ApiPropertyOptional({
    description: 'Biometrik imzo rasmi (data:image/png;base64,...)',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: "'check' — hujjatni imzolamasdan ko'rish",
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class DocumentConfirmDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() status!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}
