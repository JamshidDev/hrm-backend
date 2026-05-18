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
import { WorkDayService } from '@/modules/structure/work-days/work-day.service';
import {
  QueryWorkDayDto,
  WorkDayListResponseDto,
  CreateWorkDayDto,
  UpdateWorkDayDto,
} from '@/modules/structure/work-days/dto/work-day.dto';

@ApiTags('Structure / WorkDays')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/work-days')
export class WorkDayController {
  constructor(
    private readonly service: WorkDayService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Work-days list' })
  @ApiOkResponse({ type: WorkDayListResponseDto })
  async findAll(@Query() query: QueryWorkDayDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Create work-day' })
  @ApiOkResponse()
  async create(@Body() dto: CreateWorkDayDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Update work-day' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkDayDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Delete work-day (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
