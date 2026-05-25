import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { VacancyApproveService } from '@/modules/structure/vacancy-approve/vacancy-approve.service';
import {
  QueryVacancyApproveDto,
  AttachVacancyApproveDto,
  VacancyApproveListResponseDto,
} from '@/modules/structure/vacancy-approve/dto/vacancy-approve.dto';

// Laravel routes (prefix vacancy-approve):
//   GET    /vacancy-approve/organizations
//   POST   /vacancy-approve/attach
//   DELETE /vacancy-approve/organizations/{id}
@ApiTags('Structure / VacancyApprove')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/vacancy-approve')
export class VacancyApproveController {
  constructor(
    private readonly service: VacancyApproveService,
    private readonly i18n: I18nService,
  ) {}

  @Get('organizations')
  @ApiOperation({ summary: 'Vacancy approve organizations list' })
  @ApiOkResponse({ type: VacancyApproveListResponseDto })
  async findAll(@Query() query: QueryVacancyApproveDto) {
    return this.service.findAll(query);
  }

  @Post('attach')
  @ApiOperation({
    summary:
      'Attach to-organizations to a from-organization (replace existing)',
  })
  @ApiOkResponse()
  async attach(@Body() dto: AttachVacancyApproveDto) {
    await this.service.attach(dto);
    // Laravel: messages.successfully_attached — bizda ham qo'shamiz, fallback successfully_stored.
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete('organizations/:id')
  @ApiOperation({ summary: 'Delete vacancy approve entry' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
