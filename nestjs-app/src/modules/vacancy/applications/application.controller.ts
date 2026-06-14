// Application controller. Laravel: Vacancy/VacancySendController.
// Barcha endpointlar auth talab qiladi (Laravel: auth:vacancy).
// VacancyAuthGuard — vacancy_users provider token (Laravel Authenticate:vacancy).
// NOTE: service-layer hali vacancy_user kontekstidan emas, stub-id'dan foydalanadi (follow-up).

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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { VacancyAuthGuard } from '@/common/guards/vacancy-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { ApplicationService } from '@/modules/vacancy/applications/application.service';
import {
  QueryApplicationDto,
  SendApplicationDto,
  UploadFilesDto,
} from '@/modules/vacancy/applications/dto/application.dto';

@ApiTags('Vacancy / Applications')
@ApiBearerAuth('access-token')
@Public()
@UseGuards(VacancyAuthGuard)
@Controller('api/v1/vacancies')
export class ApplicationController {
  constructor(
    private readonly service: ApplicationService,
    private readonly i18n: I18nService,
  ) {}

  @Post('send-application')
  @ApiOperation({ summary: 'Submit a vacancy application' })
  async send(@Body() dto: SendApplicationDto) {
    await this.service.send(0, dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List candidate applications' })
  async applications(@Query() q: QueryApplicationDto) {
    return buildSuccess(true, await this.service.applications(0, q));
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Application counts grouped by status' })
  async dashboard() {
    return buildSuccess(true, await this.service.dashboard(0));
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Single application with files and status history' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(0, id));
  }

  @Post('applications/:id/files')
  @ApiOperation({ summary: 'Upload extra files for an application' })
  async uploadFiles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadFilesDto,
  ) {
    await this.service.uploadFiles(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('applications/:applicationId/files/:fileId')
  @ApiOperation({ summary: 'Delete an application file' })
  async deleteFile(
    @Param('applicationId', ParseIntPipe) _applicationId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    await this.service.deleteFile(fileId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
