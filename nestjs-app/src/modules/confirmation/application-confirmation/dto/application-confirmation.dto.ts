// Laravel ApplicationConfirmationRequest: token required|string, status nullable|string, key required|string.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApplicationConfirmationDto {
  @ApiProperty({ description: 'JWT token ({application, expires})' })
  @IsString()
  token!: string;

  @ApiPropertyOptional({
    description: "'check' bo'lsa faqat application qaytariladi",
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'E-IMZO pkcs7 imzo (signature)' })
  @IsString()
  key!: string;
}
