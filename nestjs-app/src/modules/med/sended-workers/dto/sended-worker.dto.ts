// Sended worker DTO'lar. Laravel: Med/MedController (sendToMed, sendedWorkers).

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

// GET /api/v1/med/sended-workers — paginatsiya.
export class QuerySendedWorkerDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (default: 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}

// POST /api/v1/med/send-to-med — xodimni poliklinikaga yuborish.
export class SendToMedDto {
  @ApiProperty({ description: 'Polyclinic organization id', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('organizations', 'id')
  polyclinic_id!: number;

  @ApiProperty({ description: 'Worker id', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({
    description: 'Medical check start date',
    example: '2025-01-15',
  })
  @IsDateString()
  start_date!: string;

  @ApiPropertyOptional({
    description: 'Worker position id (ishlab turgan xodim)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  worker_position_id?: number;

  @ApiPropertyOptional({ description: 'Department position id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_position_id?: number;
}
