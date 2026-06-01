// Certificates DTO'lari. Laravel: LmsCertificateController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CertificateListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Laravel'da `per_page` cheklov yo'q.
  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  edu_plan_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  group_id?: number;

  // Laravel: whereHas('worker', searchByFullName) OR whereLike('number', search).
  @ApiPropertyOptional({ example: 'Abduraxmonov' })
  @IsOptional()
  @IsString()
  search?: string;

  // whereHas('worker_position', organization_id).
  @ApiPropertyOptional({ example: 94 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  // whereYear/whereMonth(cert_from).
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  month?: number;

  // whereHas('edu_plan.specialization', direction_id).
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  direction_id?: number;

  // whereHas('edu_plan', specialization_id).
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  specialization_id?: number;
}

// Laravel `LmsCertificateController::generateCertificate` payload:
//   { group_id, cert_from, cert_to, protocol_date (Y-m-d), protocol_id?,
//     workers: [{ id?, worker_id, worker_position_id,
//                  start_exam_id?, start_exam_result?, end_exam_id?, end_exam_result? }] }
export class GenerateCertificateWorkerDto {
  @ApiPropertyOptional({ example: 4150 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number; // edu_plan_worker.id

  @ApiProperty({ example: 23015 })
  @Type(() => Number)
  @IsInt()
  worker_id!: number;

  @ApiProperty({ example: 23014 })
  @Type(() => Number)
  @IsInt()
  worker_position_id!: number;

  @ApiPropertyOptional({ example: 'string' })
  @IsOptional()
  @IsString()
  start_exam_result?: string;

  @ApiPropertyOptional({ example: 'string' })
  @IsOptional()
  @IsString()
  end_exam_result?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  start_exam_id?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  end_exam_id?: number;
}

export class GenerateCertificateDto {
  @ApiProperty({ example: 70 })
  @Type(() => Number)
  @IsInt()
  group_id!: number;

  @ApiPropertyOptional({
    example: 140,
    description: 'existing protocol → update',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  protocol_id?: number;

  @ApiProperty({ example: '2026-04-24' })
  @IsString()
  protocol_date!: string;

  @ApiProperty({ example: '2026-04-29' })
  @IsString()
  cert_from!: string;

  @ApiProperty({ example: '2029-04-29' })
  @IsString()
  cert_to!: string;

  @ApiProperty({ type: [GenerateCertificateWorkerDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => GenerateCertificateWorkerDto)
  workers!: GenerateCertificateWorkerDto[];
}
