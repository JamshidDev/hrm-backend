// Pensioner controller. Laravel: HR/PensionerController.

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
import { PensionerService } from '@/modules/hr/pensioners/pensioner.service';
import {
  CreatePensionerDto,
  PensionerListResponseDto,
  QueryPensionerDto,
  UpdatePensionerDto,
} from '@/modules/hr/pensioners/dto/pensioner.dto';

@ApiTags('HR / Pensioners')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/pensioners')
export class PensionerController {
  constructor(
    private readonly service: PensionerService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Pensioners list' })
  @ApiOkResponse({ type: PensionerListResponseDto })
  async findAll(@Query() query: QueryPensionerDto) {
    return this.service.findAll(query);
  }

  @Get('list-med')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Pensioners with latest medical check' })
  async listMed() {
    return buildSuccess(true, await this.service.listMed());
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreatePensionerDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePensionerDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
