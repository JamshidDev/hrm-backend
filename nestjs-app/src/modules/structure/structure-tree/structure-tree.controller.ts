import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { StructureTreeService } from '@/modules/structure/structure-tree/structure-tree.service';

class StructureIndexQueryDto {
  @ApiPropertyOptional({ example: 'temir yo`l' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

// Laravel routes: `/api/v1/structure`, `/all`, `/parents`, ... (auth.hybrid middleware).
//
// `getAllStructure` Laravel'da `Helper::response()` ishlatmaydi — to'g'ridan-to'g'ri
// `AnonymousResourceCollection` qaytaradi, bu `{data: [...]}` ga o'raladi.
// `index` va `leadOrganizations` — `Helper::response(true, $data)` ishlatadi.
@ApiTags('Structure / Tree')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure')
export class StructureTreeController {
  constructor(private readonly service: StructureTreeService) {}

  // Laravel: StructureController::index — `Helper::response(true, OrganizationChildResource::collection($children))`.
  // Filter: search + organization_id. Permission-based filtering hozircha admin path (PermissionGuard yo'q).
  @Get('')
  @ApiOperation({
    summary: 'Organization tree for current user (admin path — full tree)',
  })
  @ApiOkResponse()
  async index(@Query() q: StructureIndexQueryDto) {
    return this.service.index(q.search, q.organization_id);
  }

  // Laravel: AnonymousResourceCollection → `{data: [...]}` (Helper::response yo'q).
  @Get('all')
  @RawResponse()
  @ApiOperation({ summary: 'All organizations as nested tree' })
  @ApiOkResponse()
  async getAll() {
    const data = await this.service.getAll();
    return { data };
  }

  // Laravel: Helper::response(true, $data) → `{message, error, data}`.
  // ResponseInterceptor o'rab beradi (RawResponse yo'q).
  @Get('parents')
  @ApiOperation({
    summary: 'Current user organization ancestors (root → self chain)',
  })
  @ApiOkResponse()
  async getAncestors() {
    return this.service.getAncestors();
  }

  // TODO: parent-leaders, confirmations — HR module (WorkerPosition) kerak.
}
