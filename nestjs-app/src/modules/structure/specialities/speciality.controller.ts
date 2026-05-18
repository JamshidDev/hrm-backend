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
import { SpecialityService } from '@/modules/structure/specialities/speciality.service';
import {
  QuerySpecialityDto,
  SpecialityListResponseDto,
  CreateSpecialityDto,
  UpdateSpecialityDto,
} from '@/modules/structure/specialities/dto/speciality.dto';

@ApiTags('Structure / Specialities')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/specialities')
export class SpecialityController {
  constructor(
    private readonly service: SpecialityService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Specialities list' })
  @ApiOkResponse({ type: SpecialityListResponseDto })
  async findAll(@Query() query: QuerySpecialityDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('specialities-write')
  @ApiOperation({ summary: 'Create speciality' })
  @ApiOkResponse()
  async create(@Body() dto: CreateSpecialityDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('specialities-write')
  @ApiOperation({ summary: 'Update speciality' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialityDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('specialities-write')
  @ApiOperation({ summary: 'Delete speciality (soft delete)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
