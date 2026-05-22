// Department mapper. Laravel:
//   - DepartmentResource         (show endpoint)
//   - DepartmentWithJoinResource (index endpoint — parent/worker_rate/children)
//   - DepartmentListResource     (minimal — id/name/level, also `parent` field shape)

import type { I18nService } from 'nestjs-i18n';
import {
  DepartmentItemDto,
  DepartmentLevelDto,
  DepartmentListMinimalDto,
  DepartmentOrgMinDto,
  DepartmentParentMinDto,
  DepartmentTreeNodeDto,
  DepartmentWithJoinDto,
} from '@/modules/hr/departments/dto/department.dto';

// DepartmentLevelEnum: 1..14 → translation keys.
export const DEPARTMENT_LEVEL_KEYS: Record<number, string> = {
  1: 'messages.department.level.center',
  2: 'messages.department.level.department',
  3: 'messages.department.level.management',
  4: 'messages.department.level.dept',
  5: 'messages.department.level.sex',
  6: 'messages.department.level.sector',
  7: 'messages.department.level.group',
  8: 'messages.department.level.station',
  9: 'messages.department.level.bureau',
  10: 'messages.department.level.branch',
  11: 'messages.department.level.brigade',
  12: 'messages.department.level.establishment',
  13: 'messages.department.level.plot',
  14: 'messages.department.level.central',
};

function levelToDto(
  i18n: I18nService,
  id: number,
  lang: string,
): DepartmentLevelDto {
  const key = DEPARTMENT_LEVEL_KEYS[id];
  const name = key ? i18n.t(key, { lang }) : '';
  return { id, name: typeof name === 'string' ? name : '' };
}

function orgMinToDto(
  org: {
    id: number;
    name: string | null;
    name_ru: string | null;
    name_en: string | null;
    group: boolean;
  } | null,
  lang: string,
): DepartmentOrgMinDto | null {
  if (!org) return null;
  let name = org.name;
  if (lang === 'ru') name = org.name_ru ?? org.name;
  else if (lang === 'en') name = org.name_en ?? org.name;
  return { id: org.id, name, group: org.group };
}

// Parent uses DepartmentListResource shape ({id, name, level}).
function parentToDto(
  parent: { id: number; name: string; level: number } | null,
): DepartmentParentMinDto | null {
  if (!parent) return null;
  return { id: parent.id, name: parent.name, level: parent.level };
}

export interface DepartmentRow {
  id: number;
  organization_id: number;
  name: string;
  name_ru: string | null;
  name_en: string | null;
  comment: string | null;
  level: number;
  parent_id: number | null;
  _lft: number;
  _rgt: number;
  organization: {
    id: number;
    name: string | null;
    name_ru: string | null;
    name_en: string | null;
    group: boolean;
  } | null;
}

// Index row — has aggregates worker_rate + children_exists + parent (loaded separately).
export interface DepartmentIndexRow extends DepartmentRow {
  worker_rate: number; // SUM(wp.rate) — divided by 100 in mapper
  children_exists: boolean;
  parent: { id: number; name: string; level: number } | null;
}

export const DepartmentMapper = {
  // DepartmentResource (show).
  toItem(
    this: void,
    d: DepartmentRow,
    i18n: I18nService,
    lang: string,
  ): DepartmentItemDto {
    return {
      id: d.id,
      name: d.name,
      level: levelToDto(i18n, d.level, lang),
      name_ru: d.name_ru,
      name_en: d.name_en,
      comment: d.comment,
      organization: orgMinToDto(d.organization, lang),
    };
  },

  // DepartmentWithJoinResource (index).
  toWithJoinItem(
    this: void,
    d: DepartmentIndexRow,
    i18n: I18nService,
    lang: string,
  ): DepartmentWithJoinDto {
    return {
      id: d.id,
      name: d.name,
      level: levelToDto(i18n, d.level, lang),
      parent: parentToDto(d.parent),
      worker_rate: Math.trunc((d.worker_rate ?? 0) / 100),
      name_ru: d.name_ru,
      name_en: d.name_en,
      comment: d.comment,
      organization: orgMinToDto(d.organization, lang),
      children: d.children_exists,
    };
  },

  // DepartmentListResource — {id, name, level (int)}.
  toListMin(
    this: void,
    d: { id: number; name: string; level: number },
  ): DepartmentListMinimalDto {
    return { id: d.id, name: d.name, level: d.level };
  },
};
