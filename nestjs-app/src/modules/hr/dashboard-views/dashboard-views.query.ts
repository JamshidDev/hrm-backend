// HR Dashboard Views — umumiy SQL bo'laklari va ustun to'plamlari.
// Takrorlanuvchi EXISTS shartlari shu yerda bir marta yoziladi.

import { sql, type AnyColumn, type SQL } from 'drizzle-orm';
import {
  departments,
  organizations,
  positions as positionsTable,
  worker_positions,
  workers,
} from '@/db/schema';

// WorkerPosition + worker/dept/org/position join uchun umumiy SELECT ustunlari.
// Worker maydonlari Laravel Dashboard\WorkerInfoResource'ga mos.
export const wpCols = {
  wp_id: worker_positions.id,
  wp_type: worker_positions.type,
  worker_id: workers.id,
  worker_uuid: workers.uuid,
  worker_last: workers.last_name,
  worker_first: workers.first_name,
  worker_middle: workers.middle_name,
  worker_birthday: workers.birthday,
  worker_photo: workers.photo,
  dept_id: departments.id,
  dept_name: departments.name,
  dept_level: departments.level,
  pos_id: positionsTable.id,
  pos_name: positionsTable.name,
  pos_name_ru: positionsTable.name_ru,
  pos_name_en: positionsTable.name_en,
  org_id: organizations.id,
  org_name: organizations.name,
  org_name_ru: organizations.name_ru,
  org_name_en: organizations.name_en,
  org_group: organizations.group,
};

// Hodimda faol (status=2) worker_position bo'lishi + uning tashkiloti
// o'chirilmagan bo'lishi sharti. Laravel: whereHas('positions', scopeFilter).
// `workerIdRef` — Drizzle ustun yoki `sql` alias (masalan `wr.worker_id`).
export function activeWorkerPositionExists(workerIdRef: AnyColumn | SQL): SQL {
  return sql`EXISTS (SELECT 1 FROM worker_positions wp JOIN organizations o ON o.id = wp.organization_id AND o.deleted_at IS NULL WHERE wp.worker_id = ${workerIdRef} AND wp.status = 2 AND wp.deleted_at IS NULL)`;
}

// worker_position'ning tashkiloti o'chirilmagan bo'lishi sharti.
export function validOrganizationExists(orgIdRef: AnyColumn | SQL): SQL {
  return sql`EXISTS (SELECT 1 FROM organizations o WHERE o.id = ${orgIdRef} AND o.deleted_at IS NULL)`;
}
