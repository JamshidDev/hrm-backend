// Tax-five application controller. Laravel: Economist/TaxFiveApplicationController.

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
import { TaxFiveService } from '@/modules/economist/tax-five-applications/tax-five.service';
import {
  TaxFiveListQueryDto,
  CreateTaxFiveDto,
  UpdateTaxFiveDto,
} from '@/modules/economist/tax-five-applications/dto/tax-five.dto';

@ApiTags('Economist / Tax-5 Applications')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/economist')
export class TaxFiveController {
  constructor(
    private readonly service: TaxFiveService,
    private readonly i18n: I18nService,
  ) {}

  @Get('tax-five-applications')
  @ApiOperation({ summary: 'List tax-5 applications (paginated)' })
  async list(@Query() q: TaxFiveListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('tax-five-applications/:id')
  @ApiOperation({ summary: 'Show a tax-5 application' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('tax-five-applications')
  @ApiOperation({ summary: 'Create a tax-5 application' })
  async store(@Body() body: CreateTaxFiveDto) {
    await this.service.create(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('tax-five-applications/:id')
  @ApiOperation({ summary: 'Update a tax-5 application' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaxFiveDto,
  ) {
    await this.service.update(id, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('tax-five-applications/:id')
  @ApiOperation({ summary: 'Soft-delete a tax-5 application' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('tax-five-example')
  @ApiOperation({ summary: 'Get tax-5 Excel template URL' })
  example() {
    return buildSuccess(true, this.service.example());
  }
}
