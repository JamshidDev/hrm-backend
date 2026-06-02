// ConfirmationWorker DTO'lari. Laravel: HR/ConfirmationWorkerController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';
import { Exists } from '@/common/validators/exists.validator';

export class QueryConfirmationWorkerDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Vergul bilan ajratilgan organization id lar',
    example: '140,151,154',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({
    description: "Yaratilgan sana bo'yicha filter (YYYY-MM-DD)",
    example: '2026-04-28',
  })
  @IsOptional()
  @IsString()
  created?: string;
}

export class CreateConfirmationWorkerDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Exists('workers', 'id')
  worker_id!: number;

  @ApiProperty({ example: 'Boshqaruv raisi' })
  @IsString()
  @IsNotEmpty()
  position!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  level!: number;
}

export class UpdateConfirmationWorkerDto extends CreateConfirmationWorkerDto {}

// ---------- Response ----------

export class ConfirmationWorkerWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class ConfirmationWorkerOrgDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty() group!: boolean;
}

export class ConfirmationWorkerItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: ConfirmationWorkerWorkerDto, nullable: true })
  worker!: ConfirmationWorkerWorkerDto | null;
  @ApiProperty({ type: ConfirmationWorkerOrgDto, nullable: true })
  organization!: ConfirmationWorkerOrgDto | null;
  @ApiProperty({ example: { id: 1, name: 'Rahbar' } })
  level!: { id: number; name: string };
  @ApiProperty({ nullable: true }) position!: string | null;
}

export class ConfirmationWorkerListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [ConfirmationWorkerItemDto] })
  data!: ConfirmationWorkerItemDto[];
}
