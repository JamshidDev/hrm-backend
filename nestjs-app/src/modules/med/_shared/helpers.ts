// Med moduli — sub-modullar uchun umumiy yordamchi funksiyalar.

import { and, eq } from 'drizzle-orm';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { organization_polyclinics } from '@/db/schema';

export interface PageQueryLike {
  page?: number | string;
  per_page?: number | string;
}

// Pagination uchun standart hisob: page, perPage, offset qaytaradi.
export function pageOf(q?: PageQueryLike) {
  const page = Number(q?.page ?? 1);
  const perPage = Number(q?.per_page ?? 10);
  return { page, perPage, offset: (page - 1) * perPage };
}

// Joriy foydalanuvchining poliklinikasiga biriktirilgan tashkilot id'lari.
// Laravel: organization_polyclinics jadvalida polyclinic_id = user.organization_id
// bo'yicha bog'langan organization_id'lar to'plami.
export async function polyclinicOrgIds(
  db: DataSource,
  polyclinicOrgId: number | null | undefined,
): Promise<number[]> {
  if (!polyclinicOrgId) return [];
  const rows = await db
    .select({ org_id: organization_polyclinics.organization_id })
    .from(organization_polyclinics)
    .where(
      and(
        eq(organization_polyclinics.polyclinic_id, polyclinicOrgId),
        notDeleted(organization_polyclinics),
      ),
    );
  return [...new Set(rows.map((r) => r.org_id))];
}

// Laravel: MedController->polyclinics() — qattiq belgilangan poliklinika org id'lari.
export const POLYCLINIC_ORG_IDS = [
  1, 156, 159, 160, 162, 161, 163, 164, 166, 165, 167, 178,
] as const;
