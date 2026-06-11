// User Mobile controller. 19 endpoint stub — Laravel parity.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { UserMobileService } from '@/modules/user/mobile/mobile.service';
import {
  CheckLocationDto,
  MobileVersionCheckDto,
  MonthStatQueryDto,
  MyResumeQueryDto,
  MySchedulesQueryDto,
  SalaryQueryDto,
  TurnstileEventsQueryDto,
  TurnstileStartLivenessDto,
  UpdateFcmDto,
  UpdatePasswordDto,
} from '@/modules/user/mobile/dto/mobile.dto';

@ApiTags('User / Mobile')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/user/mobile')
export class UserMobileController {
  constructor(
    private readonly service: UserMobileService,
    private readonly i18n: I18nService,
  ) {}

  @Post('version')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mobile version check' })
  async version(@Body() dto: MobileVersionCheckDto) {
    return buildSuccess(true, await this.service.version(dto));
  }

  @Get('logout')
  @ApiOperation({ summary: 'Mobile JWT logout (stub)' })
  async logout() {
    return buildSuccess(true, await this.service.logout());
  }

  @Post('update-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change password' })
  async updatePassword(@Body() dto: UpdatePasswordDto) {
    // Laravel: Helper::response(trans('messages.successfully_updated'), UserResource).
    return buildSuccess(
      this.i18n.t('messages.successfully_updated'),
      await this.service.updatePassword(dto),
    );
  }

  @Get('my-schedules')
  @ApiOperation({ summary: 'My work schedules' })
  async mySchedules(@Query() q: MySchedulesQueryDto) {
    return buildSuccess(true, await this.service.mySchedules(q));
  }

  @Post('update-fcm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update FCM token' })
  async updateFcm(@Body() dto: UpdateFcmDto) {
    return buildSuccess(true, await this.service.updateFcm(dto));
  }

  @Get('personal-list')
  @ApiOperation({ summary: 'Personal info list (stub)' })
  async personalList() {
    return buildSuccess(true, await this.service.personalList());
  }

  @Get('work-info')
  @ApiOperation({ summary: 'Worker work info' })
  async workInfo() {
    return buildSuccess(true, await this.service.workInfo());
  }

  @Get('documents')
  @ApiOperation({ summary: 'My documents (stub)' })
  async documents() {
    return buildSuccess(true, await this.service.documents());
  }

  @Get('turnstile-events')
  @ApiOperation({ summary: 'My turnstile events (check-in/out) (stub)' })
  async turnstileEvents(@Query() q: TurnstileEventsQueryDto) {
    return buildSuccess(true, await this.service.turnstileEvents(q));
  }

  @Get('get-salary-months')
  @ApiOperation({ summary: 'Recent salary months (stub)' })
  async getSalaryMonths() {
    return buildSuccess(true, await this.service.getSalaryMonths());
  }

  @Get('get-salary')
  @ApiOperation({ summary: 'Salary details (stub)' })
  async getSalary(@Query() q: SalaryQueryDto) {
    return buildSuccess(true, await this.service.getSalary(q));
  }

  @Get('enums')
  @ApiOperation({
    summary: 'Mobile enums (application_types, education_types)',
  })
  enums() {
    return buildSuccess(true, this.service.enums());
  }

  @Get('my-vacations')
  @ApiOperation({ summary: 'My latest vacations (stub)' })
  async myVacations() {
    return buildSuccess(true, await this.service.myVacations());
  }

  @Get('my-resume')
  @ApiOperation({ summary: 'My resume PDF (stub)' })
  async myResume(@Query() q: MyResumeQueryDto) {
    return buildSuccess(true, await this.service.myResume(q));
  }

  @Get('last-event')
  @ApiOperation({ summary: 'Last face check-in/out event (stub)' })
  async lastEvent() {
    return buildSuccess(true, await this.service.lastEvent());
  }

  @Post('check-location')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check location (stub)' })
  async checkLocation(@Body() dto: CheckLocationDto) {
    return buildSuccess(true, await this.service.checkLocation(dto));
  }

  @Post('turnstile-start-liveness')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start face liveness for turnstile (stub)' })
  async turnstileStartLiveness(@Body() dto: TurnstileStartLivenessDto) {
    return buildSuccess(true, await this.service.turnstileStartLiveness(dto));
  }

  @Get('turnstile-stats')
  @ApiOperation({ summary: 'My today schedule/turnstile stats (stub)' })
  async turnstileStats() {
    return buildSuccess(true, await this.service.turnstileStats());
  }

  @Get('turnstile-show-stats')
  @ApiOperation({ summary: 'Monthly turnstile stats (stub)' })
  async turnstileShowStats(@Query() q: MonthStatQueryDto) {
    return buildSuccess(true, await this.service.turnstileShowStats(q));
  }
}
