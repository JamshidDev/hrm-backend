// User Face controller. Laravel: UserFaceController (faqat user prefix).

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { UserFaceService } from '@/modules/user/face/face.service';
import {
  FaceRecognitionDto,
  UpdateUserPhotosDto,
} from '@/modules/user/face/dto/face.dto';

@ApiTags('User / Face')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/user')
export class UserFaceController {
  constructor(private readonly service: UserFaceService) {}

  @Post('face/recognition')
  @HttpCode(200)
  @ApiOperation({ summary: 'Face recognition (stub)' })
  async recognize(
    @Body() dto: FaceRecognitionDto,
    @Headers('x-device-uuid') deviceUuid?: string,
  ) {
    return buildSuccess(true, await this.service.recognize(dto, deviceUuid));
  }

  @Post('face/liveness/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start face_check liveness session' })
  async startLiveness(@Headers('x-device-uuid') deviceUuid?: string) {
    return this.service.startSession(deviceUuid);
  }

  @Get('socket/verify-token')
  @ApiOperation({ summary: 'Verify auth token (socket server)' })
  async verifyToken() {
    return this.service.verifyToken();
  }

  @Post('socket/users-photos')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update user photos (socket) (stub)' })
  async updateUserPhotos(@Body() dto: UpdateUserPhotosDto) {
    return this.service.updateUserPhotos(dto);
  }
}
