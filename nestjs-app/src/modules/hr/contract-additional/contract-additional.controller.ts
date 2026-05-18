// ContractAdditional controller. Laravel: HR/ContractAdditionalController.

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
import { ContractAdditionalService } from '@/modules/hr/contract-additional/contract-additional.service';
import {
  ContractAdditionalListResponseDto,
  CreateContractAdditionalDto,
  QueryContractAdditionalDto,
} from '@/modules/hr/contract-additional/dto/contract-additional.dto';

@ApiTags('HR / Contract Additional')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/contract-additional')
export class ContractAdditionalController {
  constructor(
    private readonly service: ContractAdditionalService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Contract additional list' })
  @ApiOkResponse({ type: ContractAdditionalListResponseDto })
  async findAll(@Query() query: QueryContractAdditionalDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateContractAdditionalDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Post(':id/confirmation')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Mark contract-additional as SUCCESS (signature upload)' })
  async confirmation(@Param('id', ParseIntPipe) id: number) {
    await this.service.confirmation(id);
    return buildSuccess(this.i18n.t('messages.signature.success'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
