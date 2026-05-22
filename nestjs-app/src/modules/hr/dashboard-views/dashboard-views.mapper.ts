// HR Dashboard Views — til/i18n va umumiy DB lookup'lar.
// Context'ga bog'liq bo'lgani uchun injectable (sof helper'lardan farqli).

import { Injectable } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { workers } from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import {
  CONTRACT_TYPE_LABEL_KEYS,
  POSITION_STATUS_LABEL_KEYS,
} from '@/modules/hr/dashboard-views/dashboard-views.constants';

export interface BundledWorker {
  id: number;
  uuid: string;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birthday: string;
  photo: string | null;
}

@Injectable()
export class DashboardViewsMapper {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  // Joriy tilga mos nom (ru/en bo'lmasa uz'ga fallback).
  pickLang(
    uz: string | null,
    ru: string | null,
    en: string | null,
  ): string | null {
    const l = this.ctx.lang;
    if (l === 'ru') return ru ?? uz;
    if (l === 'en') return en ?? uz;
    return uz;
  }

  // ContractTypeEnum::get(int) — to'liq label (topilmasa bo'sh satr).
  contractTypeLabel(v: number | null): string {
    if (v == null) return '';
    const key = CONTRACT_TYPE_LABEL_KEYS[v];
    if (!key) return '';
    const val = this.i18n.t(key, { lang: this.ctx.lang });
    return typeof val === 'string' ? val : '';
  }

  // PositionStatusEnum::get(int) — holat label (topilmasa bo'sh satr).
  positionStatusLabel(v: number | null): string {
    if (v == null) return '';
    const key = POSITION_STATUS_LABEL_KEYS[v];
    if (!key) return '';
    const val = this.i18n.t(key, { lang: this.ctx.lang });
    return typeof val === 'string' ? val : '';
  }

  // Bir nechta worker'ni id bo'yicha batch yuklash (id → worker map).
  async bundleWorkers(
    workerIds: number[],
  ): Promise<Map<number, BundledWorker>> {
    if (workerIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        id: workers.id,
        uuid: workers.uuid,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        birthday: workers.birthday,
        photo: workers.photo,
      })
      .from(workers)
      .where(inArray(workers.id, workerIds));
    return new Map(rows.map((r) => [r.id, r]));
  }
}
