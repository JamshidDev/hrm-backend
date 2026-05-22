// Certificate mapper. Laravel: CertificateResource — juda chuqur nested
// (worker, organization, department, position, edu_plan).
// Hozir BRIEF version qaytaramiz (kerakli flat fieldlar + worker brief).

import type { lms_certificates } from '@/db/schema';
import {
  WorkerBriefMapper,
  type WorkerBrief,
} from '@/modules/lms/_shared/worker-brief.mapper';

type Row = typeof lms_certificates.$inferSelect;

const SERIAL_NAMES: Record<number, string> = {
  1: 'MO-RW',
  2: 'MO-LM',
  3: 'MO-SM',
};

const CONFIRMATION_NAMES: Record<number, string> = {
  1: 'Yangi',
  2: 'Rad etilgan',
  3: 'Tasdiqlangan',
};

export interface CertificateItem {
  id: number;
  uuid: string;
  worker: WorkerBrief | null;
  cert_from: string | null;
  cert_to: string | null;
  serial: string | null;
  number: string;
  start_exam_result: string | null;
  end_exam_result: string | null;
  confirmation_file: string | null;
  generate: number;
  confirmation: { id: number; name: string };
  edu_plan: { id: number; name: string | null } | null;
}

function padNumber(n: number | null, len = 6): string {
  if (n == null) return '';
  return String(n).padStart(len, '0');
}

function serialName(s: string | null): string | null {
  if (!s) return null;
  // Laravel: SerialTypeEnum::get($serial) — id (smallint), bizda varchar saqlanadi.
  // Agar son bo'lsa map'dan olamiz; aks holda raw qaytaramiz.
  const n = Number(s);
  if (Number.isFinite(n) && SERIAL_NAMES[n]) return SERIAL_NAMES[n];
  return s;
}

export const CertificateMapper = {
  toItem(
    r: Row,
    workerMap: Record<number, Parameters<typeof WorkerBriefMapper.toItem>[0]>,
    eduPlanMap: Record<number, { id: number; name: string | null }>,
  ): CertificateItem {
    const w = r.worker_id ? (workerMap[r.worker_id] ?? null) : null;
    const ep = r.edu_plan_id ? (eduPlanMap[r.edu_plan_id] ?? null) : null;
    return {
      id: r.id,
      uuid: r.uuid,
      worker: WorkerBriefMapper.toItem(w),
      cert_from: r.cert_from,
      cert_to: r.cert_to,
      serial: serialName(r.serial),
      number: padNumber(r.number),
      start_exam_result: r.start_exam_result,
      end_exam_result: r.end_exam_result,
      confirmation_file: r.confirmation_file,
      generate: r.generate,
      confirmation: {
        id: r.confirmation,
        name: CONFIRMATION_NAMES[r.confirmation] ?? 'Unknown',
      },
      edu_plan: ep,
    };
  },
};
