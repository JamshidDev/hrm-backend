// Group mapper. Laravel: GroupListResource — {id, code, workers}.
//   code = Laravel `Group::getCode($lc)` → `M{lc.code} {group.code}-guruh`
// ProtocolResource — {id, protocol_date, number: <year><pad(number,3)>, cert_from, cert_to}.

import type { lms_protocols } from '@/db/schema';

type ProtoRow = typeof lms_protocols.$inferSelect;

export interface GroupListItem {
  id: number;
  code: string;
  workers: number;
}

export interface ProtocolItem {
  id: number;
  protocol_date: string | null;
  number: string;
  cert_from: string | null;
  cert_to: string | null;
}

/** Laravel `Helper::pad_number($n, 3)` ekvivalenti. */
function padNumber(n: number | null, len: number): string {
  if (n == null) return '';
  return String(n).padStart(len, '0');
}

interface GroupBriefRow {
  id: number;
  code: number | null;
  lc_code: string | null;
}

export const GroupMapper = {
  // Laravel: 'M' . $learningCenter?->code . ' ' . $this->code . '-guruh'
  toListItem(
    r: GroupBriefRow,
    workersCount: Record<number, number>,
  ): GroupListItem {
    const lcCode = r.lc_code ?? '';
    const groupCode = r.code ?? '';
    return {
      id: r.id,
      code: `M${lcCode} ${groupCode}-guruh`,
      workers: workersCount[r.id] ?? 0,
    };
  },
};

export const ProtocolMapper = {
  toItem: (r: ProtoRow): ProtocolItem => {
    const year = r.protocol_date
      ? new Date(r.protocol_date).getFullYear()
      : new Date().getFullYear();
    return {
      id: r.id,
      protocol_date: r.protocol_date,
      number: `${year}${padNumber(r.number, 3)}`,
      cert_from: r.cert_from,
      cert_to: r.cert_to,
    };
  },
};
