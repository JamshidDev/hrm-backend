// Pension payment controller. Laravel: Economist/PensionPaymentController.

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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { PensionPaymentService } from '@/modules/economist/pension-payments/pension-payment.service';
import {
  PensionListQueryDto,
  CreatePensionDto,
  UpdatePensionDto,
} from '@/modules/economist/pension-payments/dto/pension-payment.dto';

@ApiTags('Economist / Pension Payments')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/economist')
export class PensionPaymentController {
  constructor(
    private readonly service: PensionPaymentService,
    private readonly i18n: I18nService,
  ) {}

  @Get('pension-payments')
  @ApiOperation({ summary: 'List pension payments (paginated)' })
  async list(@Query() q: PensionListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('pension-payments/:id')
  @ApiOperation({ summary: 'Show a pension payment' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('pension-payments')
  @ApiOperation({ summary: 'Create a pension payment' })
  async store(@Body() body: CreatePensionDto) {
    await this.service.create(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('pension-payments/:id')
  @ApiOperation({ summary: 'Update a pension payment' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePensionDto,
  ) {
    await this.service.update(id, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('pension-payments/:id')
  @ApiOperation({ summary: 'Soft-delete a pension payment' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('pension-example')
  @ApiOperation({ summary: 'Get pension Excel template URL' })
  example() {
    return buildSuccess(true, this.service.example());
  }
}
