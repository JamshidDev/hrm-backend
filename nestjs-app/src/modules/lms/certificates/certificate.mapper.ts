// Certificate mapper. Laravel: CertificateResource.
//   {id, uuid, worker, organization, department, position, edu_plan, cert_from,
//    cert_to, serial, number, start_exam_result, end_exam_result, confirmation_file,
//    generate, confirmation}
//
// organization/department/position — worker_position'dan. edu_plan — Laravel'da
// `$wp->edu_plan` (WorkerPosition'da edu_plan relation YO'Q) → DOIM null.

import type { lms_certificates } from '@/db/schema';

type Row = typeof lms_certificates.$inferSelect;

// Laravel SerialTypeEnum: 1→MO-RW, 2→MO-LM, 3→MO-SM.
const SERIAL_NAMES: Record<number, string> = {
  1: 'MO-RW',
  2: 'MO-LM',
  3: 'MO-SM',
};

interface OrgRow {
  id: number;
  name: string | null;
  name_ru: string | null;
  name_en: string | null;
  group: boolean | null;
}
interface DeptRow {
  id: number;
  name: string | null;
  level: number | null;
}
interface PosRow {
  id: number;
  name: string | null;
  name_ru: string | null;
  name_en: string | null;
}
interface WorkerRow {
  id: number;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  photo: string | null;
}

export interface CertificateItem {
  id: number;
  uuid: string;
  worker: {
    id: number;
    photo: string | null;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  } | null;
  organization: { id: number; name: string | null; group: boolean } | null;
  department: { id: number; name: string | null; level: number | null } | null;
  position: { id: number; name: string | null } | null;
  edu_plan: null;
  cert_from: string | null;
  cert_to: string | null;
  serial: string | null;
  number: string;
  start_exam_result: string | null;
  end_exam_result: string | null;
  confirmation_file: string | null;
  generate: number;
  confirmation: { id: number; name: string | null };
}

export interface CertificateToItemInput {
  row: Row;
  worker: WorkerRow | null;
  photo: string | null;
  wp: {
    organization_id: number | null;
    department_id: number | null;
    position_id: number | null;
  } | null;
  orgMap: Map<number, OrgRow>;
  deptMap: Map<number, DeptRow>;
  posMap: Map<number, PosRow>;
  confirmationFileUrl: string | null;
  confirmationName: string | null;
  lang: string;
}

// Laravel Helper::pad_number: str_pad((string)$number, 6, '0', LEFT).
function padNumber(n: number | null, len = 6): string {
  if (n == null) return '';
  return String(n).padStart(len, '0');
}

function serialName(s: number | string | null): string | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (SERIAL_NAMES[n] ?? '') : null;
}

function langName(
  o: { name: string | null; name_ru: string | null; name_en: string | null },
  lang: string,
): string | null {
  if (lang === 'ru') return o.name_ru ?? o.name;
  if (lang === 'en') return o.name_en ?? o.name;
  return o.name;
}

export const CertificateMapper = {
  toItem(input: CertificateToItemInput): CertificateItem {
    const { row: r, worker, photo, wp, orgMap, deptMap, posMap, lang } = input;

    const org = wp?.organization_id
      ? orgMap.get(wp.organization_id)
      : undefined;
    const dept = wp?.department_id ? deptMap.get(wp.department_id) : undefined;
    const pos = wp?.position_id ? posMap.get(wp.position_id) : undefined;

    return {
      id: r.id,
      uuid: r.uuid,
      worker: worker
        ? {
            id: worker.id,
            photo,
            last_name: worker.last_name,
            first_name: worker.first_name,
            middle_name: worker.middle_name,
          }
        : null,
      organization: org
        ? { id: org.id, name: langName(org, lang), group: org.group ?? false }
        : null,
      department: dept
        ? { id: dept.id, name: dept.name, level: dept.level }
        : null,
      position: pos ? { id: pos.id, name: langName(pos, lang) } : null,
      edu_plan: null, // Laravel: $wp->edu_plan (relation yo'q) → null
      cert_from: r.cert_from,
      cert_to: r.cert_to,
      serial: serialName(r.serial),
      number: padNumber(r.number),
      start_exam_result: r.start_exam_result,
      end_exam_result: r.end_exam_result,
      confirmation_file: input.confirmationFileUrl,
      generate: r.generate,
      confirmation: { id: r.confirmation, name: input.confirmationName },
    };
  },
};
