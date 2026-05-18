// Exam enums controller. Laravel: Exam/ExamController->enums.
// Static enumlar — frontend dropdownlari uchun.

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';

// Laravel: TopicTypeEnum::list() — barcha topic turlari.
const TOPIC_TYPES = [
  { id: 1, name: 'Attestatsiya (Sanoat xavfsizligi)' },
  { id: 2, name: 'Attestatsiya (Lavozimga loyiqligi)' },
  { id: 3, name: 'Malaka sinovi (Razryadni oshirish uchun)' },
  { id: 4, name: 'Bilim sinovi (Mehnat muhofazasi)' },
];

// Laravel: ExamWhomEnum::list() — imtihon kimga mo'ljallangani.
const TOPIC_WHOM = [
  { id: 1, name: 'Barchaga' },
  { id: 2, name: 'Tegishli lavozimlarga' },
  { id: 3, name: 'Belgilangan xodimlarga (Ishlab turgan)' },
  { id: 4, name: 'Malaka oshirish imtihonlari uchun' },
  { id: 5, name: 'Belgilangan xodimlarga (Ishlamayotgan)' },
];

// Laravel: TopicFileEnum::list() — topic fayl turlari.
const TOPIC_FILE_TYPES = [
  { id: 1, name: 'Videolar' },
  { id: 2, name: 'Rasmlar' },
  { id: 3, name: 'Kitoblar' },
  { id: 4, name: 'Audiolar' },
];

// Laravel: ResultDownloadTypeEnum::list().
const RESULT_TYPES = [{ id: 1, name: 'Imtihon natijasi' }];

@ApiTags('Exam / Enums')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam/enums')
export class ExamEnumsController {
  @Get()
  @ApiOperation({ summary: 'Exam enums (topic types, whom, file types, result types)' })
  enums() {
    return buildSuccess(true, {
      topic_types: TOPIC_TYPES,
      topic_whom: TOPIC_WHOM,
      topic_file_types: TOPIC_FILE_TYPES,
      result_types: RESULT_TYPES,
    });
  }
}
