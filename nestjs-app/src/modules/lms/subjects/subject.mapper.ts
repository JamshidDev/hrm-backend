// Subject mapper. Laravel parity: {id, name, name_ru, name_en}.

import type { subjects } from '@/db/schema';

type SubjectRow = typeof subjects.$inferSelect;

export interface SubjectItem {
  id: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
}

export const SubjectMapper = {
  toItem: (r: SubjectRow): SubjectItem => ({
    id: r.id,
    name: r.name,
    name_ru: r.name_ru,
    name_en: r.name_en,
  }),
};
