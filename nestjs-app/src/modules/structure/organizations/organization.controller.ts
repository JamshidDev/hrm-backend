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
import { OrganizationService } from '@/modules/structure/organizations/organization.service';
import {
  QueryOrganizationDto,
  QueryOrganizationListDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationListResponseDto,
  OrganizationShowResponseDto,
} from '@/modules/structure/organizations/dto/organization.dto';

// Asosiy resurs endpointlari — apiResource (`/organizations`).
@ApiTags('Structure / Organizations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure/organizations')
export class OrganizationController {
  constructor(
    private readonly service: OrganizationService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Organizations list (root nodes only)' })
  @ApiOkResponse({ type: OrganizationListResponseDto })
  async findAll(@Query() query: QueryOrganizationDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Organization detail with children' })
  @ApiOkResponse({ type: OrganizationShowResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Create organization' })
  @ApiOkResponse()
  async create(@Body() dto: CreateOrganizationDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Update organization' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('admin')
  @ApiOperation({ summary: 'Delete organization (force delete)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

// Qo'shimcha endpointlar — Laravel'da resource'dan tashqari, alohida path'lar.
//   GET /organization-list   — list filtered by search
//   GET /organization-levels — enum list
@ApiTags('Structure / Organizations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure')
export class OrganizationExtraController {
  constructor(private readonly service: OrganizationService) {}

  @Get('organization-list')
  @ApiOperation({ summary: 'Organizations list (search by name/full_name)' })
  @ApiOkResponse()
  async list(@Query() query: QueryOrganizationListDto) {
    return this.service.listForSearch(query);
  }

  @Get('organization-levels')
  @ApiOperation({ summary: 'Organization level enum' })
  @ApiOkResponse()
  levels() {
    return this.service.levels();
  }
}
