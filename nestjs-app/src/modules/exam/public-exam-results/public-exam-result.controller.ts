// Public exam result controller. Laravel: ResultController->publicExamResult.
// Auth talab qilinmaydi (UUID asosida).

import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { ResultService } from '@/modules/exam/results/result.service';

@ApiTags('Documents / Exam Results (public)')
@Controller('api/v1/documents')
export class PublicExamResultController {
  constructor(private readonly service: ResultService) {}

  @Public()
  @Get('exams/:uuid')
  @ApiOperation({ summary: 'Public exam result lookup by UUID (no auth)' })
  async result(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.publicByUuid(uuid));
  }
}
