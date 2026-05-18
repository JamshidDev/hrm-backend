// BusinessTrip controller. Laravel: HR/WorkerBusinessTripController.

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
import { BusinessTripService } from '@/modules/hr/business-trips/business-trip.service';
import {
  BusinessTripListResponseDto,
  QueryBusinessTripDto,
} from '@/modules/hr/business-trips/dto/business-trip.dto';

@ApiTags('HR / Business Trips')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/business-trips')
export class BusinessTripController {
  constructor(private readonly service: BusinessTripService) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Worker business trips list' })
  @ApiOkResponse({ type: BusinessTripListResponseDto })
  async findAll(@Query() query: QueryBusinessTripDto) {
    return this.service.findAll(query);
  }
}
