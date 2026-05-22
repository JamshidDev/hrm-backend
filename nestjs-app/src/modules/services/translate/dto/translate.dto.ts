// Translate DTO. Laravel: TranslateController->translate.
// Laravel current implementation faylni o'qimaydi (kommentariy), bu yerda
// optional fayl yo'lini qabul qilamiz.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TranslateRequestDto {
  @ApiPropertyOptional({
    example: 'public_path/phpF217.html',
    description:
      'Manba HTML fayl yo`li (Laravel parity — odatda multipart upload, hozir stub).',
  })
  @IsOptional()
  @IsString()
  file?: string;

  @ApiPropertyOptional({ example: 'docx' })
  @IsOptional()
  @IsString()
  format?: string;
}
