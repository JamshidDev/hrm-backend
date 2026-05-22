// Admin Deploy controller. Laravel: DeployController.

import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { DeployService } from '@/modules/admin/deploy/deploy.service';
import {
  DeployListQueryDto,
  DeployPublishDto,
  DeployStoreDto,
  DeployUploadDto,
} from '@/modules/admin/deploy/dto/deploy.dto';

@ApiTags('Admin / Deploy')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/admin/deploy')
export class DeployController {
  constructor(
    private readonly service: DeployService,
    private readonly i18n: I18nService,
  ) {}

  @Get('logs')
  @ApiOperation({ summary: 'List deploy logs (paginated)' })
  async list(@Query() q: DeployListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post('logs')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log backend deploy (auto version bump)' })
  async logBackend(@Body() dto: DeployStoreDto) {
    await this.service.logBackend(dto);
    return buildSuccess(this.i18n.t('messages.deploy_success'), []);
  }

  @Post('upload')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Upload frontend zip (stub — file ops deployment-specific)',
  })
  async upload(@Body() dto: DeployUploadDto) {
    await this.service.uploadFrontend(dto);
    return buildSuccess(this.i18n.t('messages.deploy_success'), []);
  }

  @Put('publish/:id')
  @ApiOperation({ summary: 'Update publish flag on deploy log' })
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeployPublishDto,
  ) {
    await this.service.publish(id, dto);
    return buildSuccess(this.i18n.t('messages.deploy_published_success'), []);
  }
}
