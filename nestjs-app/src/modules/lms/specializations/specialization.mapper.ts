// Specialization mapper. Laravel parity (field order matters):
//   List   (SpecializationListResource): {id, name, direction, name_ru, name_en, positions_count}
//   Detail (SpecializationShowResource): {id, name, direction, name_ru, name_en, positions}

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
  // Laravel `SpecializationListResource`: id, name, direction, name_ru, name_en, positions_count.
  toListItem(
    r: SpecRow,
    dirMap: Record<number, DirectionBrief>,
    posCountMap: Record<number, number>,
  ): SpecListItem {
    return {
      id: r.id,
      name: r.name,
      direction: dirMap[r.direction_id] ?? null,
      name_ru: r.name_ru,
      name_en: r.name_en,
      positions_count: posCountMap[r.id] ?? 0,
    };
  },

  // Laravel `SpecializationShowResource`: id, name, direction, name_ru, name_en, positions.
  toDetail(
    r: SpecRow,
    direction: DirectionBrief | null,
    positions: PositionBrief[],
  ): SpecDetail {
    return {
      id: r.id,
      name: r.name,
      direction,
      name_ru: r.name_ru,
      name_en: r.name_en,
      positions,
    };
  },
};
