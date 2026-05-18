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
import { HolidayService } from '@/modules/structure/holidays/holiday.service';
import {
  QueryHolidayDto,
  HolidayListResponseDto,
  CreateHolidayDto,
  UpdateHolidayDto,
} from '@/modules/structure/holidays/dto/holiday.dto';

@ApiTags('Structure / Holidays')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/holidays')
export class HolidayController {
  constructor(
    private readonly service: HolidayService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Holidays list (default: current month)' })
  @ApiOkResponse({ type: HolidayListResponseDto })
  async findAll(@Query() query: QueryHolidayDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Create holiday' })
  @ApiOkResponse()
  async create(@Body() dto: CreateHolidayDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Update holiday' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHolidayDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Delete holiday (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
