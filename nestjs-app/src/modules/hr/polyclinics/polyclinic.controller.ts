// Polyclinic controller. Laravel: HR/OrganizationPolyclinicController.

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
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { PolyclinicService } from '@/modules/hr/polyclinics/polyclinic.service';
import {
  CreatePolyclinicDto,
  PolyclinicListResponseDto,
  QueryPolyclinicDto,
} from '@/modules/hr/polyclinics/dto/polyclinic.dto';

@ApiTags('HR / Polyclinics')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/polyclinics')
export class PolyclinicController {
  constructor(
    private readonly service: PolyclinicService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Polyclinics linked to current user organization' })
  @ApiOkResponse({ type: PolyclinicListResponseDto })
  async findAll(@Query() query: QueryPolyclinicDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async create(@Body() dto: CreatePolyclinicDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
