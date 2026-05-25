// Contract controller. Laravel: HR/ContractController.

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
import { ContractService } from '@/modules/hr/contracts/contract.service';
import {
  ContractListResponseDto,
  CreateContractDto,
  QueryContractDto,
} from '@/modules/hr/contracts/dto/contract.dto';

@ApiTags('HR / Contracts')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/contracts')
export class ContractController {
  constructor(
    private readonly service: ContractService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Contracts list (with worker+organization joins)' })
  @ApiOkResponse({ type: ContractListResponseDto })
  async findAll(@Query() query: QueryContractDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary:
      'Contract detail (worker + contract_position + command + confirmations)',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.findOne(id));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Create contract (+ optional worker_position)' })
  async create(@Body() dto: CreateContractDto) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.create(dto),
    );
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Delete contract (cannot delete if confirmed=SUCCESS)',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
