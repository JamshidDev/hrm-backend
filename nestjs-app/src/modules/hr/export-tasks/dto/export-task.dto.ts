// ExportTask DTO'lari. Laravel: HR/Exports/ExportTaskController.

import { ApiProperty } from '@nestjs/swagger';
import { SearchPaginationQueryDto } from '@/common/dto/pagination.dto';

export class QueryExportTaskDto extends SearchPaginationQueryDto {}

// ---------- Response ----------

export class ExportTaskWorkerDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) photo!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) middle_name!: string | null;
}

export class ExportTaskItemDto {
  @ApiProperty() id!: number;
  // Laravel: type STRING (translated label, not {id, name}).
  @ApiProperty({ example: "Xodimlar ma'lumotlarini excelga yuklash" })
  type!: string;
  @ApiProperty() status!: { id: number; name: string };
  @ApiProperty({ type: ExportTaskWorkerDto, nullable: true })
  worker!: ExportTaskWorkerDto | null;
  @ApiProperty({ nullable: true }) file!: string | null;
  @ApiProperty({ nullable: true }) read_at!: string | null;
  @ApiProperty({ nullable: true }) created_at!: string | null;
  @ApiProperty({ nullable: true }) updated_at!: string | null;
}

export class ExportTaskListResponseDto {
  @ApiProperty() current_page!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [ExportTaskItemDto] }) data!: ExportTaskItemDto[];
}
