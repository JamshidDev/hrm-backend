// Specialization mapper. Laravel parity:
//   List: {id, name, name_ru, name_en, direction: {id, name}, positions_count}
//   Detail: {id, name, name_ru, name_en, direction: {id, name}, positions: [{id, name}]}

import type { specializations } from '@/db/schema';

type SpecRow = typeof specializations.$inferSelect;

interface DirectionBrief {
  id: number;
  name: string;
}
interface PositionBrief {
  id: number;
  name: string;
}

export interface SpecListItem {
  id: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  direction: DirectionBrief | null;
  positions_count: number;
}

export interface SpecDetail {
  id: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  direction: DirectionBrief | null;
  positions: PositionBrief[];
}

export const SpecializationMapper = {
  toListItem(
    r: SpecRow,
    dirMap: Record<number, DirectionBrief>,
    posCountMap: Record<number, number>,
  ): SpecListItem {
    return {
      id: r.id,
      name: r.name,
      name_ru: r.name_ru,
      name_en: r.name_en,
      direction: dirMap[r.direction_id] ?? null,
      positions_count: posCountMap[r.id] ?? 0,
    };
  },

  toDetail(
    r: SpecRow,
    direction: DirectionBrief | null,
    positions: PositionBrief[],
  ): SpecDetail {
    return {
      id: r.id,
      name: r.name,
      name_ru: r.name_ru,
      name_en: r.name_en,
      direction,
      positions,
    };
  },
};
