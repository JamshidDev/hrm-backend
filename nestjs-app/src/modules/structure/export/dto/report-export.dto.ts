// Report-export DTO. Laravel: ReportExportController::export() validatsiyasi.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportExportDto {
  // Hisobot turi. Laravel `match($type)` faqat 'by-education-age-invalid' ni qabul qiladi.
  @ApiProperty({ example: 'by-education-age-invalid' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  // Tashkilotlar — vergul bilan ajratilgan id'lar (masalan '138' yoki '138,140').
  @ApiPropertyOptional({ example: '138' })
  @IsOptional()
  @IsString()
  organizations?: string;
}
