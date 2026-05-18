// Economist enums service. Laravel: EconomistController->enums + structure.
// Frontend dropdownlari + tashkilot daraxti uchun.

import { Injectable } from '@nestjs/common';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { organizations } from '@/db/schema';
import { getCodeNames } from '@/modules/economist/_shared/code-names';
import { getUploadDeadline } from '@/modules/economist/_shared/code-groups';
import {
  uploadTypesList,
  uploadStatusesList,
} from '@/modules/economist/_shared/upload-enums';

@Injectable()
export class EconomistEnumsService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * GET /api/v1/economist/enums — Laravel parity.
   * Frontend uchun upload types, statuses, kodlar lug'ati (i18n bilan).
   */
  enums(lang?: string) {
    return {
      upload_types: uploadTypesList(),
      upload_statuses: uploadStatusesList(),
      codes: getCodeNames(lang),
    };
  }

  /**
   * GET /api/v1/economist/structure — joriy oy/yil bo'yicha tashkilotlar daraxti
   * va deadline (yuklash muddati).
   *
   * Laravel: foydalanuvchining roli/ruxsatlariga qarab `Organization::adminOrganizations`
   * yoki `leaderOrganizations` ishlatadi. Bu yerda biz oddiy variant: barcha
   * tashkilotlarni qaytaramiz (auth/permission ilgariroq qo'shilib bormoqda).
   */
  async structure(q: { year?: number | string; month?: number | string }) {
    const year =
      q?.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month =
      q?.month !== undefined ? Number(q.month) : new Date().getMonth() + 1;

    // 1. Barcha tashkilotlar (kelajakda user.allowedOrganizations() bilan filterlanadi)
    const orgRows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        full_name: organizations.full_name,
        parent_id: organizations.parent_id,
        code: organizations.code,
      })
      .from(organizations)
      .where(notDeleted(organizations));

    // 2. parent_id bo'yicha guruhlash + tree qurish
    const childrenMap = new Map<number | null, typeof orgRows>();
    for (const o of orgRows) {
      const parent = o.parent_id ?? null;
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(o);
    }

    const build = (parentId: number | null): any[] =>
      (childrenMap.get(parentId) ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        full_name: o.full_name,
        code: o.code,
        children: build(o.id),
      }));

    return {
      children: build(null),
      deadline: getUploadDeadline(year, month).toISOString(),
      now: new Date().toISOString(),
    };
  }
}
