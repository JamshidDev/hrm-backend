// Leader controller. Laravel: HR/OrganizationLeaderController.

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
import { LeaderService } from '@/modules/hr/leaders/leader.service';
import {
  CreateLeaderDto,
  LeaderListResponseDto,
  QueryLeaderDto,
  UpdateLeaderDto,
} from '@/modules/hr/leaders/dto/leader.dto';

@ApiTags('HR / Organization Leaders')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/leaders')
export class LeaderController {
  constructor(
    private readonly service: LeaderService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Organization leaders list' })
  @ApiOkResponse({ type: LeaderListResponseDto })
  async findAll(@Query() query: QueryLeaderDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async create(@Body() dto: CreateLeaderDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaderDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
