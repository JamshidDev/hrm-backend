// Zoom controller. Laravel: App/Http/Controllers/ZoomController->checkMeeting.
// Vacancy routes ichida ochiq (public) endpoint.
// ESLATMA: Laravel tashqi Zoom API'siga ulanadi — bu yerda stub javob.

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';

@ApiTags('Vacancy / Zoom')
@Controller('api/v1/vacancies/zoom')
export class VacancyZoomController {
  @Public()
  @Post('check-meet')
  @ApiOperation({
    summary: 'Check Zoom meeting availability (external API stub)',
  })
  checkMeeting(@Body() _body: Record<string, unknown>) {
    // Laravel tashqi Zoom API'sini chaqiradi; hozircha doim mavjud deb qaytaramiz.
    return buildSuccess(true, { available: true });
  }
}
