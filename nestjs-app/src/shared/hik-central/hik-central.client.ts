// HikCentral API client. Laravel: App\Services\HikCentralService.
//
// HMAC-SHA256 signing + JSON POST to external HCP server. Credentials from env:
//   HIK_CENTRAL_URL    — base URL
//   HIK_CENTRAL_KEY    — x-ca-key header
//   HIK_CENTRAL_SECRET — HMAC secret
//
// Methods:
//   - groups(pageNo)    — /artemis/api/resource/v1/org/orgList
//   - accessLevels()    — /artemis/api/acs/v1/privilege/group  (2 pages, type=1)
//   - devicesList(p,s)  — /artemis/api/resource/v1/acsDevice/acsDeviceList

import { createHmac } from 'node:crypto';
import { request as httpsRequest, Agent as HttpsAgent } from 'node:https';
import { URL } from 'node:url';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '@/common/exceptions/business.exception';

// Laravel: CURLOPT_SSL_VERIFYPEER=false va VERIFYHOST=false — self-signed HCP serverga
// ishonish uchun. node:https request bilan rejectUnauthorized=false beramiz.
const HCP_AGENT = new HttpsAgent({
  rejectUnauthorized: false,
  keepAlive: true,
});

function postJson(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = httpsRequest(
      {
        method: 'POST',
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        agent: HCP_AGENT,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            text: Buffer.concat(chunks).toString('utf-8'),
          }),
        );
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    req.write(body);
    req.end();
  });
}

export interface HcpResponse<T = unknown> {
  code: number;
  msg?: string;
  data?: T;
}

export interface HcpListResp<T> {
  total: number;
  pageNo: number;
  pageSize: number;
  list: T[];
}

// --- Access level item (from /privilege/group response) ---
export interface HcpPrivilegeGroup {
  privilegeGroupId: number | string;
  privilegeGroupName: string;
  description?: string;
  ElementList: Array<{ Element: HcpDeviceElement }>;
}
export interface HcpDeviceElement {
  ID: number | string;
  BaseInfo: { Name: string; AreaName?: string };
}

// --- Device item (from /acsDevice/acsDeviceList response) ---
export interface HcpAcsDevice {
  acsDevIndexCode: number | string;
  acsDevName: string;
  acsDevCode: string;
  status: number;
}

// --- Org item (from /org/orgList response) ---
export interface HcpOrg {
  orgIndexCode: number | string;
  orgName: string;
}

// --- Door event (from /acs/v1/door/events) ---
export interface HcpDoorEvent {
  doorIndexCode: string;
  doorName: string;
  eventTime: string;
  cardNo?: string;
  temperatureStatus?: number;
  wearMaskStatus?: number;
}

@Injectable()
export class HikCentralClient {
  private readonly logger = new Logger(HikCentralClient.name);
  private readonly baseUrl: string;
  private readonly key: string;
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.baseUrl = (config.get<string>('HIK_CENTRAL_URL') ?? '').replace(
      /\/$/,
      '',
    );
    this.key = config.get<string>('HIK_CENTRAL_KEY') ?? '';
    this.secret = config.get<string>('HIK_CENTRAL_SECRET') ?? '';
  }

  // True agar konfiguratsiya bor.
  configured(): boolean {
    return Boolean(this.baseUrl && this.key && this.secret);
  }

  // Laravel: generateCurl — HMAC-SHA256(base64).
  // message = METHOD\n*/*\n(Content-Type bo'sh yoki application/json)\nx-ca-key:KEY\nURL
  private signature(method: string, urlPath: string, hasBody: boolean): string {
    const message = [
      method,
      '*/*',
      hasBody ? 'application/json' : '',
      `x-ca-key:${this.key}`,
      urlPath,
    ].join('\n');
    return createHmac('sha256', this.secret).update(message).digest('base64');
  }

  // Laravel: requestCurl — POST JSON, 3 retry, return parsed object.
  async post<T = unknown>(
    urlPath: string,
    body: unknown,
  ): Promise<HcpResponse<T>> {
    if (!this.configured()) {
      throw new BusinessException(500, 'HikCentral not configured');
    }
    const bodyJson = JSON.stringify(body ?? {});
    const sig = this.signature('POST', urlPath, true);
    const url = this.baseUrl + urlPath;
    const headers: Record<string, string> = {
      Accept: '*/*',
      'x-ca-key': this.key,
      'x-ca-signature': sig,
      'x-ca-signature-headers': 'x-ca-key',
      'Content-Type': 'application/json',
    };

    const maxAttempts = 3;
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await postJson(url, headers, bodyJson, 50_000);
        try {
          return JSON.parse(res.text) as HcpResponse<T>;
        } catch {
          throw new Error(`Invalid JSON response: ${res.text.slice(0, 200)}`);
        }
      } catch (err) {
        lastErr = err as Error;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    this.logger.error(
      `HCP request failed after ${maxAttempts} attempts: ${lastErr?.message ?? 'unknown'}`,
    );
    throw new BusinessException(500, lastErr?.message ?? 'HCP request failed');
  }

  // /artemis/api/resource/v1/org/orgList — paginated org list.
  async groups(
    pageNo = 1,
  ): Promise<{ status: boolean; msg: HcpListResp<HcpOrg> | string }> {
    const res = await this.post<HcpListResp<HcpOrg>>(
      '/artemis/api/resource/v1/org/orgList',
      { pageNo, pageSize: 500 },
    );
    if (Number(res.code) === 0 && res.data) {
      return { status: true, msg: res.data };
    }
    return { status: false, msg: res.msg ?? 'Unknown error' };
  }

  // /artemis/api/acs/v1/privilege/group — 2 pages (pageSize=499).
  async accessLevels(): Promise<{
    status: boolean;
    data?: HcpPrivilegeGroup[][];
    msg?: string;
  }> {
    const data: HcpPrivilegeGroup[][] = [];
    const r1 = await this.post<HcpListResp<HcpPrivilegeGroup>>(
      '/artemis/api/acs/v1/privilege/group',
      { pageNo: 1, pageSize: 499, type: 1 },
    );
    if (!r1.data?.list?.length) {
      return { status: false, msg: r1.msg };
    }
    data.push(r1.data.list);
    const r2 = await this.post<HcpListResp<HcpPrivilegeGroup>>(
      '/artemis/api/acs/v1/privilege/group',
      { pageNo: 2, pageSize: 499, type: 1 },
    );
    if (r2.data?.list?.length) {
      data.push(r2.data.list);
    }
    return { status: true, data };
  }

  // Laravel: attachWorkerToAccessLevel — addPersons to privilege group.
  async attachWorkerToAccessLevel(
    workerIds: Array<string | number>,
    accessLevelId: string | number,
  ): Promise<{ status: boolean; msg?: string }> {
    const list = workerIds.map((id) => ({ id: String(id) }));
    const res = await this.post<unknown>(
      '/artemis/api/acs/v1/privilege/group/single/addPersons',
      { privilegeGroupId: String(accessLevelId), type: 1, list },
    );
    if (Number(res.code) === 0) {
      return { status: true, msg: res.msg };
    }
    return { status: false, msg: res.msg };
  }

  // Laravel: detachWorkerFromAccessLevel — deletePersons from privilege group.
  async detachWorkerFromAccessLevel(
    workerIds: Array<string | number>,
    accessLevelId: string | number,
  ): Promise<{ status: boolean; msg?: string }> {
    const list = workerIds.map((id) => ({ id: String(id) }));
    const res = await this.post<unknown>(
      '/artemis/api/acs/v1/privilege/group/single/deletePersons',
      { privilegeGroupId: String(accessLevelId), type: 1, list },
    );
    if (Number(res.code) === 0) {
      return { status: true, msg: res.msg };
    }
    return { status: false, msg: res.msg };
  }

  // Laravel: addWorkerToServer — person/single/add. Returns personId on success.
  async addWorkerToServer(
    worker: {
      id: number | string;
      last_name?: string | null;
      first_name?: string | null;
      middle_name?: string | null;
      sex?: boolean | number | null;
      card?: number | null;
    },
    photoBase64: string,
    endTime: string | null,
    orgIndexCode: string,
  ): Promise<{ status: boolean; personId?: string | number; msg?: string }> {
    const tzShift = (d: Date, hours: number) =>
      new Date(d.getTime() + hours * 3600_000);
    const isoCN = (d: Date) => {
      const off = tzShift(d, 8); // +08:00
      const pad = (n: number) => String(n).padStart(2, '0');
      const y = off.getUTCFullYear();
      const mo = pad(off.getUTCMonth() + 1);
      const da = pad(off.getUTCDate());
      const h = pad(off.getUTCHours());
      const mi = pad(off.getUTCMinutes());
      const s = pad(off.getUTCSeconds());
      return `${y}-${mo}-${da}T${h}:${mi}:${s}+08:00`;
    };
    const now = new Date();
    const beginTime = isoCN(new Date(now.getTime() - 4 * 3600_000));
    const endDate = endTime
      ? new Date(endTime)
      : new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    const body = {
      personCode: String(worker.id),
      personFamilyName: worker.last_name ?? '',
      personGivenName: worker.first_name ?? '',
      remark: worker.middle_name ?? '',
      gender: worker.sex,
      orgIndexCode: String(orgIndexCode ?? '1'),
      phoneNo: '',
      email: '',
      faces: [{ faceData: photoBase64 }],
      cards: [{ cardNo: String(worker.card ?? '') }],
      beginTime,
      endTime: isoCN(endDate),
    };
    const res = await this.post<string | { personId?: string }>(
      '/artemis/api/resource/v1/person/single/add',
      body,
    );
    if (Number(res.code) === 0) {
      const personId =
        typeof res.data === 'string' ? res.data : res.data?.personId;
      return { status: true, personId };
    }
    return { status: false, msg: res.msg };
  }

  // Laravel: updatePersonFace — /person/face/update.
  async updatePersonFace(
    personId: string | number,
    photoBase64: string,
  ): Promise<HcpResponse<unknown>> {
    return this.post<unknown>('/artemis/api/resource/v1/person/face/update', {
      personId: String(personId),
      faceData: photoBase64,
    });
  }

  // Laravel: editWorkerFromHCP — /person/single/update (expiry/info edit).
  async editWorkerFromHCP(
    personId: string | number,
    worker: {
      id: number | string;
      last_name?: string | null;
      first_name?: string | null;
      middle_name?: string | null;
      card?: number | null;
    },
    endTime: string | null,
  ): Promise<{ status: boolean; personId?: string; msg?: string }> {
    const isoCN = (d: Date) => {
      const off = new Date(d.getTime() + 8 * 3600_000);
      const pad = (n: number) => String(n).padStart(2, '0');
      return (
        `${off.getUTCFullYear()}-${pad(off.getUTCMonth() + 1)}-${pad(off.getUTCDate())}` +
        `T${pad(off.getUTCHours())}:${pad(off.getUTCMinutes())}:${pad(off.getUTCSeconds())}+08:00`
      );
    };
    const now = new Date();
    const endDate = endTime
      ? new Date(endTime)
      : new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    const body = {
      personId: String(personId),
      personCode: String(worker.id),
      personFamilyName: worker.last_name ?? '',
      personGivenName: worker.first_name ?? '',
      remark: worker.middle_name ?? '',
      cards: [{ cardNo: String(worker.card ?? '') }],
      beginTime: isoCN(new Date(now.getTime() - 4 * 3600_000)),
      endTime: isoCN(endDate),
    };
    const res = await this.post<string>(
      '/artemis/api/resource/v1/person/single/update',
      body,
    );
    if (Number(res.code) === 0) {
      return {
        status: true,
        personId: typeof res.data === 'string' ? res.data : undefined,
      };
    }
    return { status: false, msg: res.msg };
  }

  // Laravel: doorEvents — /artemis/api/acs/v1/door/events.
  // Returns paginated turnstile events; eventType=196893 (face verify pass).
  async doorEvents(
    startTime: string,
    endTime: string,
    doors: string[],
    pageSize = 500,
    pageNo = 1,
  ): Promise<{
    status: boolean;
    total?: number;
    list?: Array<HcpDoorEvent>;
    msg?: string;
  }> {
    const res = await this.post<{
      total: number;
      list: Array<HcpDoorEvent>;
    }>('/artemis/api/acs/v1/door/events', {
      pageNo,
      pageSize,
      eventType: 196893,
      doorIndexCodes: doors,
      startTime,
      endTime,
    });
    if (Number(res.code) === 0 && res.data) {
      return { status: true, total: res.data.total, list: res.data.list ?? [] };
    }
    return { status: false, msg: res.msg };
  }

  // /artemis/api/resource/v1/acsDevice/acsDeviceList — single page.
  async devicesList(
    pageNo: number,
    pageSize: number,
  ): Promise<{
    status: boolean;
    total?: number;
    list?: HcpAcsDevice[];
    msg?: string;
  }> {
    const res = await this.post<HcpListResp<HcpAcsDevice>>(
      '/artemis/api/resource/v1/acsDevice/acsDeviceList',
      { pageNo, pageSize, type: 1 },
    );
    if (Number(res.code) === 0 && res.data) {
      return { status: true, total: res.data.total, list: res.data.list ?? [] };
    }
    return { status: false, msg: res.msg };
  }
}
