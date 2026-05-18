// WorkerPosition mapper. Laravel: WorkerPositionResource.

import type { I18nService } from 'nestjs-i18n';
import { CONTRACT_TYPE_MIN_KEYS } from '@/modules/hr/workers/worker.mapper';
import {
  WorkerPositionListItemDto,
  WPDeptMinDto,
  WPOrgMinDto,
  WPPositionMinDto,
  WPTypeDto,
  WPWorkerMinDto,
} from '@/modules/hr/worker-positions/dto/worker-position.dto';

export interface WorkerPositionListRow {
  id: number;
  uuid: string;
  type: number;
  position_date: string | null;
  group: number;
  rank: string | null;
  rate: number;
  salary: number | null;
  // Worker
  worker_id: number | null;
  worker_uuid: string | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  worker_birthday: string | null;
  worker_pin: number | null;
  // Organization
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
  // Department
  dept_id: number | null;
  dept_name: string | null;
  dept_level: number | null;
  // Position
  pos_id: number | null;
  pos_name: string | null;
  pos_name_ru: string | null;
  pos_name_en: string | null;
}

function workerToDto(this: void, r: WorkerPositionListRow): WPWorkerMinDto | null {
  if (r.worker_id == null) return null;
  return {
    id: r.worker_id,
    uuid: r.worker_uuid ?? '',
    // Laravel: signed URL — NestJS hozircha raw path. Test masks photo.
    photo: r.worker_photo,
    last_name: r.worker_last,
    first_name: r.worker_first,
    middle_name: r.worker_middle,
    birthday: r.worker_birthday ?? '',
    // Laravel WorkerInfoResource'da `pin` mavjud, lekin WorkerPositionController
    // index'da `worker:id,uuid,...,photo` faqat shu fieldlarni load qiladi (pin yo'q).
    // Parity uchun shuningdek null.
    pin: null,
  };
}

function orgToDto(this: void, r: WorkerPositionListRow, lang: string): WPOrgMinDto | null {
  if (r.org_id == null) return null;
  let name = r.org_name;
  if (lang === 'ru') name = r.org_name_ru ?? r.org_name;
  else if (lang === 'en') name = r.org_name_en ?? r.org_name;
  return {
    id: r.org_id,
    name,
    group: r.org_group ?? false,
  };
}

function deptToDto(this: void, r: WorkerPositionListRow): WPDeptMinDto | null {
  if (r.dept_id == null) return null;
  return {
    id: r.dept_id,
    name: r.dept_name ?? '',
    level: r.dept_level ?? 0,
  };
}

function positionToDto(
  this: void,
  r: WorkerPositionListRow,
  lang: string,
): WPPositionMinDto | null {
  if (r.pos_id == null) return null;
  let name = r.pos_name;
  if (lang === 'ru') name = r.pos_name_ru ?? r.pos_name;
  else if (lang === 'en') name = r.pos_name_en ?? r.pos_name;
  return { id: r.pos_id, name };
}

function typeToDto(
  this: void,
  type: number,
  i18n: I18nService,
  lang: string,
): WPTypeDto {
  const key = CONTRACT_TYPE_MIN_KEYS[type];
  const label = key ? i18n.t(key, { lang }) : '';
  return { id: type, name: typeof label === 'string' ? label : '' };
}

export const WorkerPositionMapper = {
  toListItem(
    this: void,
    r: WorkerPositionListRow,
    i18n: I18nService,
    lang: string,
  ): WorkerPositionListItemDto {
    return {
      id: r.id,
      uuid: r.uuid,
      worker: workerToDto(r),
      organization: orgToDto(r, lang),
      department: deptToDto(r),
      position: positionToDto(r, lang),
      type: typeToDto(r.type, i18n, lang),
      position_date: r.position_date,
      group: r.group,
      rank: r.rank,
      // Laravel Attribute: rate = $value / 100.
      rate: (r.rate ?? 0) / 100,
      salary: r.salary,
    };
  },
};
