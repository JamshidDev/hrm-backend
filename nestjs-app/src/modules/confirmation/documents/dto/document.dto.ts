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

// POST /api/v1/confirmation/document/signature — E-IMZO raqamli imzo (yoki
// biometrik / button) bilan confirmation'ni tasdiqlash. Laravel:
// DocumentController::confirmation → DocumentConfirmationFlowService::approve.
// Frontend `{model, confirmation_id, code(PKCS7), pin, ...}` yuboradi.
export class DocumentSignatureDto {
  @ApiProperty({ example: 'commands' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ example: 286581 })
  @Type(() => Number)
  @IsInt()
  confirmation_id!: number;

  // E-IMZO PKCS7 (attached) imzo — DIGITAL imzo uchun majburiy.
  @ApiPropertyOptional({ description: 'E-IMZO PKCS7 base64 signature' })
  @IsOptional()
  @IsString()
  code?: string;

  // Sertifikat PIN'i (verify natijasi bilan solishtiriladi; test PIN'lar bor).
  @ApiPropertyOptional({ description: 'Imzolovchi PIN (JSHSHIR/STIR)' })
  @IsOptional()
  @IsString()
  pin?: string;

  // ConfirmationStatusEnum: 3=SUCCESS(tasdiq), 4=REJECTED(rad). Default approve.
  @ApiPropertyOptional({
    example: 3,
    description: '4=rad etish, aks holda tasdiq',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  // ConfirmationTypeEnum: 1=DIGITAL, 2=BIOMETRIC, 3=BUTTON. Default DIGITAL.
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  confirmation_type?: number;

  // Rad etishda izoh.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  // Biometrik imzo rasmi (data:image/png;base64,...).
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signature?: string;
}

export class ForwardConfirmationDto {
  @ApiProperty() @IsString() @IsNotEmpty() model_type!: string;
  @ApiProperty() @Type(() => Number) @IsInt() model_id!: number;
  @ApiProperty() @Type(() => Number) @IsInt() confirmation_id!: number;
}

export class DocumentBase64QueryDto {
  // Laravel: $request->model + $request->document_id (frontend shu nomlarni yuboradi).
  @ApiProperty() @IsString() @IsNotEmpty() model!: string;
  @ApiProperty() @Type(() => Number) @IsInt() document_id!: number;
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
