// TimeSheet controller. Laravel: TimeSheet/TimeSheetController.

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
import { buildSuccess } from '@/common/utils/response.util';
import { TimeSheetService } from '@/modules/timesheet/timesheet/timesheet.service';
import {
  CreateTimeSheetDto,
  QueryTimeSheetDto,
  TimeSheetListResponseDto,
  UpdateTimeSheetDto,
} from '@/modules/timesheet/timesheet/dto/timesheet.dto';

@ApiTags('TimeSheet / TimeSheets')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/timesheet')
export class TimeSheetController {
  constructor(
    private readonly service: TimeSheetService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'TimeSheet list (own user)' })
  @ApiOkResponse({ type: TimeSheetListResponseDto })
  async findAll(@Query() query: QueryTimeSheetDto) {
    return this.service.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create timesheet' })
  async create(@Body() dto: CreateTimeSheetDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update timesheet' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimeSheetDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept timesheet (status=true)' })
  async accept(@Param('id', ParseIntPipe) id: number) {
    await this.service.accept(id);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete timesheet (soft)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
