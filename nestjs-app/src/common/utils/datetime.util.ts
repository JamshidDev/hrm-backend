// PG `timestamp without timezone` column'lari uchun mahalliy vaqtda string format.
// Laravel `now()` bilan ekzakt mos: "Y-m-d H:i:s" — server local TZ.

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDb(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function nowDb(): string {
  return formatDb(new Date());
}

export function plusMinutesDb(minutes: number): string {
  return formatDb(new Date(Date.now() + minutes * 60_000));
}

// Laravel Carbon `toJson()` ekvivalenti: "Y-m-d\TH:i:s.000000\Z".
// PG `timestamp without timezone` Laravel'da UTC deb qabul qilinadi va Z bilan qaytariladi.
// Drizzle bizga raw string qaytaradi: "2025-05-10 20:38:35" yoki Date object.
export function toLaravelTimestamp(
  v: string | Date | null | undefined,
): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    // PG raw: "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS.000000Z".
    // Allaqachon ISO formatda kelgan bo'lsa (T + Z) — qayta yozmaymiz.
    if (v.includes('T') && (v.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(v))) {
      return v;
    }
    return v.replace(' ', 'T') + '.000000Z';
  }
  // Date object — UTC ISO chiqarib, .000Z'ni .000000Z'ga uzaytiramiz.
  return v.toISOString().replace(/\.\d{3}Z$/, '.000000Z');
}

// Laravel Carbon `toDateTimeString()` ekvivalenti: "Y-m-d H:i:s" (no T, no microseconds).
export function toLaravelDateTime(
  v: string | Date | null | undefined,
): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    // PG raw: "YYYY-MM-DD HH:MM:SS" — already correct.
    if (!v.includes('T')) return v;
    // ISO format → strip T and milliseconds/timezone.
    return v.replace('T', ' ').replace(/\.\d+/, '').replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
  }
  // Date object → "YYYY-MM-DD HH:MM:SS" UTC.
  return v.toISOString().slice(0, 19).replace('T', ' ');
}
