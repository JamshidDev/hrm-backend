import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
import { OrganizationServiceService } from '@/modules/structure/organization-services/organization-service.service';
import {
  QueryOrganizationServiceDto,
  CreateOrganizationServiceDto,
} from '@/modules/structure/organization-services/dto/organization-service.dto';

// Laravel routes: GET + POST (PUT/DELETE yo'q, faqat upsert).
@ApiTags('Structure / OrganizationServices')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/organization-services')
export class OrganizationServiceController {
  constructor(
    private readonly service: OrganizationServiceService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Organization services list (per organization)' })
  @ApiOkResponse()
  async findAll(@Query() query: QueryOrganizationServiceDto) {
    return this.service.findAll(query);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Upsert organization service' })
  @ApiOkResponse()
  async create(@Body() dto: CreateOrganizationServiceDto) {
    await this.service.create(dto);
    // Laravel: Helper::response(trans('messages.success_created'))
    // Bizda 'success_created' yo'q — 'successfully_stored' ishlatamiz (xuddi shunday ma'no).
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }
}
