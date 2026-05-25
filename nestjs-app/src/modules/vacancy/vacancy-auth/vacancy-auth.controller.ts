// Vacancy auth controller. Laravel: Vacancy/VacancyUserController.
// login/token/register — ochiq (public); profile/update — auth talab qiladi.
//
// ESLATMA: Laravel `auth:vacancy` guard. NestJS'da bu guard hali yo'q —
// hozircha auth endpointlar AuthHybridGuard bilan himoyalangan va
// foydalanuvchi id'si stub (0). Vacancy guard keyingi bosqichda qo'shiladi.

import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { Public } from '@/common/decorators/public.decorator';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { VacancyAuthService } from '@/modules/vacancy/vacancy-auth/vacancy-auth.service';
import {
  VacancyLoginDto,
  VacancyOtpDto,
  VacancyRegisterDto,
  VacancyUpdateDto,
  VacancyUpdatePhotoDto,
} from '@/modules/vacancy/vacancy-auth/dto/vacancy-auth.dto';

@ApiTags('Vacancy / Auth')
@Controller('api/v1/vacancies')
export class VacancyAuthController {
  constructor(
    private readonly service: VacancyAuthService,
    private readonly i18n: I18nService,
  ) {}

  // --- Public auth endpoints ---

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Vacancy candidate login (phone + password)' })
  async login(@Body() dto: VacancyLoginDto) {
    return buildSuccess(true, await this.service.login(dto));
  }

  @Public()
  @Post('token')
  @ApiOperation({ summary: 'Send OTP code (creates pending candidate)' })
  async token(@Body() dto: VacancyOtpDto) {
    return buildSuccess(true, await this.service.sendOtp(dto));
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Verify OTP and set password' })
  async register(@Body() dto: VacancyRegisterDto) {
    return buildSuccess(true, await this.service.register(dto));
  }

  // --- Authenticated endpoints (vacancy guard — hozircha stub user id = 0) ---

  @ApiBearerAuth('access-token')
  @UseGuards(AuthHybridGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Current vacancy candidate profile' })
  async profile() {
    return buildSuccess(true, await this.service.profile(0));
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthHybridGuard)
  @Post('profile/update-photo')
  @ApiOperation({ summary: 'Update candidate photo' })
  async updatePhoto(@Body() dto: VacancyUpdatePhotoDto) {
    await this.service.updatePhoto(0, dto.photo);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthHybridGuard)
  @Put('profile/update')
  @ApiOperation({ summary: 'Update candidate profile fields' })
  async update(@Body() dto: VacancyUpdateDto) {
    await this.service.update(0, dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }
}
