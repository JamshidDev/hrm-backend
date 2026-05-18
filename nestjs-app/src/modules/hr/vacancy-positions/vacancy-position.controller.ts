// VacancyPosition controller (HR routes — full vacancy domain in HR module).

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { VacancyPositionService } from '@/modules/hr/vacancy-positions/vacancy-position.service';
import {
  AttachExamDto,
  ChangeStatusDto,
  CreateVacancyPositionDto,
  QueryVacancyPositionDto,
  UpdateApplicationStatusDto,
  UpdateVacancyPositionDto,
  UploadFileDto,
} from '@/modules/hr/vacancy-positions/dto/vacancy-position.dto';

@ApiTags('HR / Vacancy Positions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/vacancy')
export class VacancyPositionController {
  constructor(
    private readonly service: VacancyPositionService,
    private readonly i18n: I18nService,
  ) {}

  // GET /api/v1/hr/vacancy — old VacancyController handles list.

  @Get('positions')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Department positions for vacancy creation' })
  async positions(@Query() query: QueryVacancyPositionDto) {
    return buildSuccess(true, await this.service.positionsForVacancy(query));
  }

  @Post('positions')
  @UseGuards(PermissionGuard) @Permission('hr')
  async store(@Body() dto: CreateVacancyPositionDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Get(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.findOne(id));
  }

  @Get(':id/edit')
  @UseGuards(PermissionGuard) @Permission('hr')
  async edit(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.edit(id));
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVacancyPositionDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Put(':id/change-status')
  @UseGuards(PermissionGuard) @Permission('hr')
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ) {
    await this.service.changeStatus(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Put(':id/finish')
  @UseGuards(PermissionGuard) @Permission('hr')
  async finish(@Param('id', ParseIntPipe) id: number) {
    await this.service.finish(id);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get(':id/applications')
  @UseGuards(PermissionGuard) @Permission('hr')
  async applications(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryVacancyPositionDto,
  ) {
    return buildSuccess(
      true,
      await this.service.applications(id, query.per_page ?? 10, query.page ?? 1),
    );
  }

  @Put(':id/applications/:applicationId')
  @UseGuards(PermissionGuard) @Permission('hr')
  async updateApplicationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    await this.service.updateApplicationStatus(id, applicationId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id/applications/:applicationId')
  @UseGuards(PermissionGuard) @Permission('hr')
  async removeApplication(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    await this.service.removeApplication(id, applicationId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get(':id/applications/:applicationId/show-user')
  @UseGuards(PermissionGuard) @Permission('hr')
  async showVacancyUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    return buildSuccess(
      true,
      await this.service.showVacancyUser(id, applicationId),
    );
  }

  @Post(':id/applications/:applicationId/upload')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Upload file for application' })
  async uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() dto: UploadFileDto,
  ) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.uploadApplicationFile(id, applicationId, dto.file_name),
    );
  }

  @Post(':id/applications/:applicationId/create-meet')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Create Zoom meeting for application (stub)' })
  async createMeet(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    return buildSuccess(true, await this.service.createMeet(id, applicationId));
  }

  @Put(':id/applications/:applicationId/attach-exam')
  @UseGuards(PermissionGuard) @Permission('hr')
  async attachExam(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() dto: AttachExamDto,
  ) {
    await this.service.attachExam(id, applicationId, dto.exam_id);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id/applications/:applicationId/detach-exam')
  @UseGuards(PermissionGuard) @Permission('hr')
  async detachExam(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    await this.service.detachExam(id, applicationId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Put(':id/applications/:applicationId/update-exam')
  @UseGuards(PermissionGuard) @Permission('hr')
  async updateExam(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    await this.service.updateExam(id, applicationId);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Put(':id/applications/:applicationId/update')
  @UseGuards(PermissionGuard) @Permission('hr')
  async updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    await this.service.updateApplication(id, applicationId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}

// Laravel: POST /api/v1/hr/zoom/check-meet
@ApiTags('HR / Zoom')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/zoom')
export class HrZoomController {
  constructor(private readonly service: VacancyPositionService) {}

  @Post('check-meet')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Check Zoom meeting (stub)' })
  async checkMeeting(@Body() body: { meeting_id?: string }) {
    return buildSuccess(
      true,
      await this.service.zoomCheckMeeting(body.meeting_id ?? ''),
    );
  }
}
