// WorkerPhone DTO'lari. Laravel: WorkerPhoneController.
//
// Endpointlar:
//   - GET    /api/v1/hr/worker-phones?uuid=
//   - POST   /api/v1/hr/worker-phones
//   - PUT    /api/v1/hr/worker-phones/{id}
//   - DELETE /api/v1/hr/worker-phones/{id}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Exists } from '@/common/validators/exists.validator';

export class QueryWorkerPhoneDto {
  @ApiPropertyOptional({ example: 'b8c0a9...' })
  @IsOptional()
  @IsString()
  uuid?: string;
}

export class CreateWorkerPhoneDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: '998900000000' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class UpdateWorkerPhoneDto extends CreateWorkerPhoneDto {}

// ---------- Response ----------

export class WorkerPhoneItemDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 998900000000, nullable: true }) phone!: number | null;
}
