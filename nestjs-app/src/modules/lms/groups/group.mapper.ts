// Group mapper. Laravel: GroupListResource — {id, code: formatted, workers: count}.
// ProtocolResource — {id, protocol_date, number: <year><pad(number,3)>, cert_from, cert_to}.

import type { groups, lms_protocols } from '@/db/schema';

type GroupRow = typeof groups.$inferSelect;
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

export const GroupMapper = {
  toListItem(r: GroupRow, workersCount: Record<number, number>): GroupListItem {
    // code = `${lc.short_name}-${pad(group.code, 3)}` — Laravel'da getCode metodi.
    // Bizda hozir LC short_name yo'q, code raqamini formatlangan stringga aylantiramiz.
    return {
      id: r.id,
      code: padNumber(r.code, 3),
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
