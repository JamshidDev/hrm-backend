// Zoom Server-to-Server OAuth integratsiyasi. Laravel: app/Services/ZoomService.
//   - authenticate(): account_credentials grant → access_token (cache + 60s margin)
//   - createMeeting(topic, startTime, duration): POST users/me/meetings
//   - eventSecret: webhook url_validation HMAC uchun (ZOOM_EVENT_SECRET)
// Kalitlar .env: ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET / ZOOM_ACCOUNT_ID / ZOOM_EVENT_SECRET.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '@/common/exceptions/business.exception';

export interface ZoomMeetingResponse {
  uuid: string;
  id: number;
  start_url: string;
  join_url: string;
  password?: string;
  [k: string]: unknown;
}

@Injectable()
export class ZoomService {
  private readonly logger = new Logger(ZoomService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('ZOOM_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('ZOOM_CLIENT_SECRET') ?? '';
    this.accountId = this.config.get<string>('ZOOM_ACCOUNT_ID') ?? '';
  }

  get eventSecret(): string {
    return this.config.get<string>('ZOOM_EVENT_SECRET') ?? '';
  }

  // Laravel authenticate() — token hali yo'q yoki expired bo'lsa yangilaydi.
  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() / 1000 < this.tokenExpiresAt) return;

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      throw new BusinessException(
        500,
        'Zoom kalitlari sozlanmagan (ZOOM_CLIENT_ID/SECRET/ACCOUNT_ID)',
      );
    }

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );
    const res = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: this.accountId,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Zoom auth xato: ${res.status} ${text}`);
      throw new BusinessException(502, 'Zoom autentifikatsiya xatosi');
    }
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() / 1000 + data.expires_in - 60;
  }

  // Laravel createMeeting($topic, $time, $duration) — Scheduled meeting (type 2).
  async createMeeting(
    topic: string,
    startTime: string,
    duration: number,
  ): Promise<ZoomMeetingResponse> {
    await this.authenticate();

    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startTime,
        duration,
        timezone: 'Asia/Tashkent',
        settings: {
          host_video: true,
          participant_video: false,
          join_before_host: true,
          mute_upon_entry: true,
          waiting_room: false,
          approval_type: 2,
          registration_type: 0,
          audio: 'both',
          auto_recording: 'cloud',
          enforce_login: false,
          meeting_authentication: false,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Zoom createMeeting xato: ${res.status} ${text}`);
      throw new BusinessException(502, 'Zoom meeting yaratishda xato');
    }
    return (await res.json()) as ZoomMeetingResponse;
  }
}
