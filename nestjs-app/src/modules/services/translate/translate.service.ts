// Translate service. Laravel: TranslateController->translate.
// Laravel local LibreOffice/Pandoc binarylarini chaqiradi va `1` qaytaradi.
// Bu yerda stub — real implement keyin (Pandoc/LibreOffice binarylari deployment'ga bog'liq).

import { Injectable } from '@nestjs/common';
import type { TranslateRequestDto } from '@/modules/services/translate/dto/translate.dto';

@Injectable()
export class TranslateService {
  /**
   * POST /api/v1/services/translate — Laravel `return 1;` qaytaradi.
   * Biz `buildSuccess(true, 1)` qaytaramiz (parity: data: 1).
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async translate(_dto: TranslateRequestDto) {
    return 1;
  }
}
