import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { StructureTreeService } from '@/modules/structure/structure-tree/structure-tree.service';

// Laravel routes: `/api/v1/structure/all`, `/parents`, ... (auth.hybrid middleware).
//
// Laravel'da `getAllStructure` `Helper::response()` ishlatmaydi — to'g'ridan-to'g'ri
// `AnonymousResourceCollection` qaytaradi, bu `{data: [...]}` ga o'raladi.
// `leadOrganizations` (parents) — `Helper::response(true, $data)` ishlatadi, `{message, error, data}`.
@ApiTags('Structure / Tree')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure')
export class StructureTreeController {
  constructor(private readonly service: StructureTreeService) {}

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

  // TODO: index, parent-leaders, confirmations — HR module (WorkerPosition) kerak.
}
