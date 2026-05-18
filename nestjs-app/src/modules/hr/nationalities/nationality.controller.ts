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
import { NationalityService } from '@/modules/hr/nationalities/nationality.service';
import {
  QueryNationalityDto,
  NationalityListResponseDto,
  CreateNationalityDto,
  UpdateNationalityDto,
} from '@/modules/hr/nationalities/dto/nationality.dto';

@ApiTags('HR / Nationalities')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/nationalities')
export class NationalityController {
  constructor(
    private readonly service: NationalityService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Nationalities list' })
  @ApiOkResponse({ type: NationalityListResponseDto })
  async findAll(@Query() query: QueryNationalityDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('nationalities-write')
  @ApiOperation({ summary: 'Create nationality' })
  @ApiOkResponse()
  async create(@Body() dto: CreateNationalityDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('nationalities-write')
  @ApiOperation({ summary: 'Update nationality' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNationalityDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('nationalities-write')
  @ApiOperation({ summary: 'Delete nationality (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
