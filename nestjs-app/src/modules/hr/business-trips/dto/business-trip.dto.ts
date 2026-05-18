// BusinessTrip DTO'lari. Laravel: HR/WorkerBusinessTripController.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryBusinessTripDto extends SearchPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt()
  organization_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizations?: string;
}

// ---------- Response ----------

export class BusinessTripWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class BusinessTripWorkerPositionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: BusinessTripWorkerDto, nullable: true })
  worker!: BusinessTripWorkerDto | null;
  @ApiProperty() post_name!: string;
  @ApiProperty() post_short_name!: string;
}

export class BusinessTripItemDto {
  @ApiProperty() id!: number;
  @ApiProperty({ type: BusinessTripWorkerPositionDto, nullable: true })
  worker_position!: BusinessTripWorkerPositionDto | null;
  @ApiProperty() type!: { id: number; name: string };
  @ApiProperty({ nullable: true }) from!: string | null;
  @ApiProperty({ nullable: true }) to!: string | null;
  @ApiProperty({ nullable: true }) to_organization!: string | null;
}

export class BusinessTripListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() per_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [BusinessTripItemDto] }) data!: BusinessTripItemDto[];
}
