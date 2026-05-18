// Education controller. Laravel: Vacancy/VacancyUserEducationController (resource).
// Barcha endpointlar auth talab qiladi (Laravel: auth:vacancy).
// ESLATMA: vacancy guard hali yo'q — hozircha AuthHybridGuard + stub user id = 0.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { EducationService } from '@/modules/vacancy/educations/education.service';
import {
  CreateEducationDto,
  UpdateEducationDto,
} from '@/modules/vacancy/educations/dto/education.dto';

@ApiTags('Vacancy / Educations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/vacancies/educations')
export class EducationController {
  constructor(
    private readonly service: EducationService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List candidate education records' })
  async list() {
    return buildSuccess(true, await this.service.list(0));
  }

  @Post()
  @ApiOperation({ summary: 'Add an education record' })
  async store(@Body() dto: CreateEducationDto) {
    await this.service.create(0, dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored') as string, []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an education record' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEducationDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an education record' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }
}
