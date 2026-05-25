// Career controller. Laravel: Vacancy/VacancyUserCareerController (resource).
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
import { CareerService } from '@/modules/vacancy/careers/career.service';
import {
  CreateCareerDto,
  UpdateCareerDto,
} from '@/modules/vacancy/careers/dto/career.dto';

@ApiTags('Vacancy / Careers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/vacancies/careers')
export class CareerController {
  constructor(
    private readonly service: CareerService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List candidate work experience' })
  async list() {
    return buildSuccess(true, await this.service.list(0));
  }

  @Post()
  @ApiOperation({ summary: 'Add a work experience record' })
  async store(@Body() dto: CreateCareerDto) {
    await this.service.create(0, dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a work experience record' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCareerDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a work experience record' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
