// Signature (E-IMZO) service. Laravel: Modules\Structure\SignatureController.
// challenge + auth tashqi E-IMZO serverga (config signature.url) proxy qiladi.
//
// MUHIM: SIGNATURE_SERVER env o'rnatilmagan bo'lsa default http://localhost:8080/.
// E-IMZO server ishlamasa challenge/auth ulanish xatosi beradi (Laravel ham xuddi
// shunday 500/400 qaytaradi).

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { SanctumService } from '@/modules/auth/sanctum.service';
import { users, workers } from '@/db/schema';
import type { SignatureAuthDto } from '@/modules/structure/signature/dto/signature.dto';

// E-IMZO sertifikatdagi PIN OID (subjectName ichidagi kalit).
const PIN_OID = '1.2.860.3.16.1.2';

@Injectable()
export class SignatureService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly sanctum: SanctumService,
    private readonly i18n: I18nService,
  ) {}

  // config('signature.url') — env('SIGNATURE_SERVER', 'http://localhost:8080/').
  private baseUrl(): string {
    return this.config.get<string>(
      'SIGNATURE_SERVER',
      'http://localhost:8080/',
    );
  }

  /**
   * GET /signature/challenge — E-IMZO frontend/challenge'ni proxy qiladi.
   * Laravel: muvaffaqiyatda Helper::response(true, json); aks holda (true, body, 400).
   */
  async challenge(): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}frontend/challenge`, {
        method: 'GET',
        headers: {
          'X-REAL-IP': '192.168.82.99',
          Host: 'hrm.railway.uz',
          'Content-Type': 'text/plain',
        },
      });
    } catch {
      // Laravel'da Http::get ulanish xatosi → 500. Bu yerda 400 body bilan beramiz.
      throw new BusinessException(
        400,
        true as unknown as string,
        'E-IMZO server bilan aloqa xatosi',
      );
    }
    if (res.ok) {
      return res.json();
    }
    const body = await res.text();
    throw new BusinessException(400, true as unknown as string, body);
  }

  /**
   * POST /signature/auth — pkcs7'ni E-IMZO backend/auth'ga yuboradi, sertifikatdan
   * PIN olib, shu PIN'li worker'ning user'iga sanctum token beradi.
   * Muvaffaqiyatda RAW {access_token, message} qaytaradi (Helper::response emas).
   */
  async auth(dto: SignatureAuthDto): Promise<{
    access_token: string;
    message: string;
  }> {
    const result = await this.signatureAuth(dto.code);
    if (!result.status) {
      throw new BusinessException(400, result.message as string, []);
    }
    // signatureAuth faqat status===1 bo'lganda status:true qaytaradi.
    const response = result.payload!;
    const pinRaw = response.subjectCertificateInfo?.subjectName?.[PIN_OID];
    const pin = Number(pinRaw);

    const [u] = await this.db
      .select({ id: users.id })
      .from(users)
      .innerJoin(workers, eq(workers.id, users.worker_id))
      .where(eq(workers.pin, pin))
      .limit(1);

    if (!u) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.user_not_found'),
        [],
      );
    }

    const token = await this.sanctum.createToken(u.id, 'web');
    return {
      access_token: token,
      message: this.i18n.t('auth.login_success'),
    };
  }

  // Laravel signatureAuth($pkcs7): E-IMZO backend/auth (POST text/plain).
  private async signatureAuth(pkcs7: string): Promise<{
    status: boolean;
    message: unknown;
    payload?: EimzoAuthResponse;
  }> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}backend/auth`, {
        method: 'POST',
        headers: {
          'X-Real-IP': '192.168.82.99',
          Host: 'hrm.railway.uz',
          'Content-Type': 'text/plain',
        },
        body: pkcs7,
      });
    } catch (e) {
      // Laravel: httpCode !== 200 → RuntimeException (500).
      throw new BusinessException(
        500,
        (e as Error)?.message ?? 'E-IMZO connection error',
      );
    }
    if (res.status !== 200) {
      throw new BusinessException(500, await res.text());
    }
    const parsed = (await res.json()) as EimzoAuthResponse;
    if (parsed.status !== 1) {
      return { status: false, message: parsed.message };
    }
    return { status: true, message: parsed, payload: parsed };
  }
}

// E-IMZO backend/auth javobi (qisman).
interface EimzoAuthResponse {
  status: number;
  message?: string;
  subjectCertificateInfo?: {
    subjectName?: Record<string, string>;
  };
}
