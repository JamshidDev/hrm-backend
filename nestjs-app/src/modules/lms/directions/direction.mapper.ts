// Direction mapper. Laravel parity: {id, name, name_ru, name_en} (timestamp/deleted_at YOQ).

import type { directions } from '@/db/schema';

type DirectionRow = typeof directions.$inferSelect;

export interface DirectionItem {
  id: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
}

export const DirectionMapper = {
  toItem: (r: DirectionRow): DirectionItem => ({
    id: r.id,
    name: r.name,
    name_ru: r.name_ru,
    name_en: r.name_en,
  }),
};
