// Tax-four application controller. Laravel: Economist/TaxFourApplicationController.

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
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { TaxFourService } from '@/modules/economist/tax-four-applications/tax-four.service';
import {
  TaxFourListQueryDto,
  CreateTaxFourDto,
  UpdateTaxFourDto,
} from '@/modules/economist/tax-four-applications/dto/tax-four.dto';

@ApiTags('Economist / Tax-4 Applications')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('economist')
@Controller('api/v1/economist')
export class TaxFourController {
  constructor(
    private readonly service: TaxFourService,
    private readonly i18n: I18nService,
  ) {}

  @Get('tax-four-applications')
  @ApiOperation({ summary: 'List tax-4 applications (paginated)' })
  async list(@Query() q: TaxFourListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('tax-four-applications/:id')
  @ApiOperation({ summary: 'Show a tax-4 application' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('tax-four-applications')
  @ApiOperation({ summary: 'Create a tax-4 application' })
  async store(@Body() body: CreateTaxFourDto) {
    await this.service.create(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('tax-four-applications/:id')
  @ApiOperation({ summary: 'Update a tax-4 application' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaxFourDto,
  ) {
    await this.service.update(id, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('tax-four-applications/:id')
  @ApiOperation({ summary: 'Soft-delete a tax-4 application' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('tax-four-example')
  @ApiOperation({ summary: 'Get tax-4 Excel template URL' })
  example() {
    return buildSuccess(true, this.service.example());
  }
}
