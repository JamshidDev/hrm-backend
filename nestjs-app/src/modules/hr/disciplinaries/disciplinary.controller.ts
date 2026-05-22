// Disciplinary controller. Laravel: HR/OrganizationDisciplinaryController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { DisciplinaryService } from '@/modules/hr/disciplinaries/disciplinary.service';
import {
  DisciplinaryListResponseDto,
  QueryDisciplinaryDto,
} from '@/modules/hr/disciplinaries/dto/disciplinary.dto';

@ApiTags('HR / Disciplinary Actions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/discips')
export class DisciplinaryController {
  constructor(private readonly service: DisciplinaryService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Organization disciplinary actions list' })
  @ApiOkResponse({ type: DisciplinaryListResponseDto })
  async findAll(@Query() query: QueryDisciplinaryDto) {
    return this.service.findAll(query);
  }
}
