// DepartmentPosition mapper. Laravel resources:
//   - DepartmentPositionWithJoinResource (index)
//   - DepartmentPositionResource         (show)

import type { I18nService } from 'nestjs-i18n';
import {
  DepartmentPositionWithJoinDto,
  DepartmentPositionShowDto,
  DPIdNameDto,
} from '@/modules/hr/department-positions/dto/department-position.dto';

// Laravel enums.
export const EDUCATION_KEYS: Record<number, string> = {
  1: 'messages.education.level.one',
  2: 'messages.education.level.two',
  3: 'messages.education.level.three',
};

export const CONFIRM_STATUS_KEYS: Record<number, string> = {
  1: 'messages.economist.changed.confirm_statuses.new',
  2: 'messages.economist.changed.confirm_statuses.process',
  3: 'messages.economist.changed.confirm_statuses.done',
  4: 'messages.economist.changed.confirm_statuses.reject',
};

export const CHANGED_STATUS_KEYS: Record<number, string> = {
  1: 'messages.economist.changed.change_statuses.created',
  2: 'messages.economist.changed.change_statuses.updated',
  3: 'messages.economist.changed.change_statuses.deleted',
};

function tr(i18n: I18nService, key: string | undefined, lang: string): string {
  if (!key) return '';
  const v = i18n.t(key, { lang });
  return typeof v === 'string' ? v : '';
}

// Laravel `[id => $val, name => $val]` — for raw fields (group/rank/max_rank) returns
// id == name (i.e. string).
function idEqualsName(value: unknown): DPIdNameDto {
  return {
    id: value as number | string | null,
    name: value as number | string | null,
  };
}

// Enum {id, name} via i18n.
function enumIdName(
  i18n: I18nService,
  keys: Record<number, string>,
  id: number | null,
  lang: string,
): DPIdNameDto {
  return { id, name: tr(i18n, id != null ? keys[id] : undefined, lang) };
}

// Index row from leftJoin pipeline.
export interface DepartmentPositionIndexRow {
  id: number;
  organization_id: number | null;
  department_id: number | null;
  position_id: number | null;
  rate: number;
  group: number;
  rank: string | null;
  max_rank: string | null;
  salary: number | null;
  experience: number;
  education: number;
  status: number;
  changed_status: number;
  worker_rate: number;
  // Joined:
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean;
  dept_name: string | null;
  dept_level: number | null;
  pos_name: string | null;
}

// Show row — full position + organization + department.
export interface DepartmentPositionShowRow {
  id: number;
  organization_id: number | null;
  department_id: number | null;
  position_id: number | null;
  rate: number;
  group: number;
  rank: string | null;
  max_rank: string | null;
  salary: number | null;
  experience: number;
  education: number;
  status: number;
  changed_status: number;
  worker_rate: number;

  organization: {
    id: number;
    name: string | null;
    name_ru: string | null;
    name_en: string | null;
    group: boolean;
  } | null;

  department: {
    id: number;
    name: string;
    level: number;
  } | null;

  position: {
    id: number;
    name: string;
    name_ru: string | null;
    classification_index: number | null;
    classification_code: number | null;
  } | null;
}

export const DepartmentPositionMapper = {
  toIndexItem(
    this: void,
    r: DepartmentPositionIndexRow,
    i18n: I18nService,
    lang: string,
  ): DepartmentPositionWithJoinDto {
    let orgName = r.org_name;
    if (lang === 'ru') orgName = r.org_name_ru ?? r.org_name;
    else if (lang === 'en') orgName = r.org_name_en ?? r.org_name;

    return {
      id: r.id,
      organization: {
        id: r.organization_id ?? 0,
        name: orgName,
        group: r.org_group ?? false,
      },
      department: {
        id: r.department_id ?? 0,
        name: r.dept_name,
        level: r.dept_level,
      },
      position: {
        id: r.position_id ?? 0,
        name: r.pos_name,
      },
      // Laravel Attribute: get => $value / 100 (DB scaled int → display rate).
      rate: (r.rate ?? 0) / 100,
      worker_rate: Math.trunc((r.worker_rate ?? 0) / 100),
      group: idEqualsName(r.group),
      rank: idEqualsName(r.rank),
      max_rank: idEqualsName(r.max_rank),
      salary: r.salary,
      experience: r.experience,
      education: enumIdName(i18n, EDUCATION_KEYS, r.education, lang),
      status: enumIdName(i18n, CONFIRM_STATUS_KEYS, r.status, lang),
      changed_status: enumIdName(
        i18n,
        CHANGED_STATUS_KEYS,
        r.changed_status,
        lang,
      ),
    };
  },

  toShowItem(
    this: void,
    r: DepartmentPositionShowRow,
    i18n: I18nService,
    lang: string,
  ): DepartmentPositionShowDto {
    let orgName: string | null = null;
    if (r.organization) {
      orgName = r.organization.name;
      if (lang === 'ru')
        orgName = r.organization.name_ru ?? r.organization.name;
      else if (lang === 'en')
        orgName = r.organization.name_en ?? r.organization.name;
    }

    return {
      id: r.id,
      organization: r.organization
        ? {
            id: r.organization.id,
            name: orgName,
            group: r.organization.group ?? false,
          }
        : null,
      department: r.department
        ? {
            id: r.department.id,
            name: r.department.name,
            level: r.department.level,
          }
        : null,
      position: r.position
        ? {
            id: r.position.id,
            name: r.position.name,
            name_ru: r.position.name_ru,
            classification_index: r.position.classification_index,
            classification_code: r.position.classification_code,
          }
        : null,
      // Laravel Attribute: get => $value / 100 (DB scaled int → display rate).
      rate: (r.rate ?? 0) / 100,
      worker_rate: Math.trunc((r.worker_rate ?? 0) / 100),
      group: idEqualsName(r.group),
      rank: idEqualsName(r.rank),
      max_rank: idEqualsName(r.max_rank),
      salary: r.salary,
      experience: r.experience,
      education: enumIdName(i18n, EDUCATION_KEYS, r.education, lang),
      status: enumIdName(i18n, CONFIRM_STATUS_KEYS, r.status, lang),
      changed_status: enumIdName(
        i18n,
        CHANGED_STATUS_KEYS,
        r.changed_status,
        lang,
      ),
    };
  },
};
