// Med workers controller. Laravel: Med/MedController (workers, polyclinics, dashboard, organizations).

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { MedWorkersService } from '@/modules/med/med-workers/med-workers.service';
import { QueryMedWorkersDto } from '@/modules/med/med-workers/dto/med-workers.dto';

@ApiTags('Med / Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/med')
export class MedWorkersController {
  constructor(private readonly service: MedWorkersService) {}

  @Get('workers')
  @ApiOperation({ summary: 'List med records for current polyclinic' })
  async workers(@Query() query: QueryMedWorkersDto) {
    return buildSuccess(true, await this.service.workers(query));
  }

  @Get('polyclinics')
  @ApiOperation({ summary: 'List polyclinic organizations (fixed ids)' })
  async polyclinics() {
    return buildSuccess(true, await this.service.polyclinics());
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Med dashboard statistics for current polyclinic' })
  async dashboard() {
    return buildSuccess(true, await this.service.dashboard());
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Organizations attached to current polyclinic' })
  async organizations() {
    return buildSuccess(true, await this.service.organizations());
  }
}
