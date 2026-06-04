// HR Zoom controller. Laravel: HR routes `Gzoom/check-meet` (AuthHybrid + permission:hr).

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { ZoomService } from '@/modules/hr/zoom/zoom.service';
import { ZoomCheckMeetingDto } from '@/modules/hr/zoom/dto/zoom.dto';

@ApiTags('HR / Zoom')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class HrZoomController {
  constructor(private readonly service: ZoomService) {}

  // Laravel: Helper::response(true, checkMeeting(meet_uuid, meet_id)).
  @Post('Gzoom/check-meet')
  @Permission('hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check Zoom meeting availability' })
  async checkMeeting(@Body() dto: ZoomCheckMeetingDto) {
    return buildSuccess(
      true,
      await this.service.checkMeeting(dto.meet_uuid, dto.meet_id),
    );
  }
}
