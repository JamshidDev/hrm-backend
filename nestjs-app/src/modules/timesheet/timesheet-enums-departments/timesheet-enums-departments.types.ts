// TimeSheetTypeEnum (Laravel) → letter codes va i18n keys.

export interface TimeSheetTypeItem {
  id: number;
  name: string;
  key: string;
  hours: boolean;
}

// id → letter code (Laravel TimeSheetTypeEnum::key).
export const TIMESHEET_TYPE_KEY: Record<number, string> = {
  1: 'K',
  2: 'T',
  3: 'РП',
  5: 'С',
  10: 'К',
  14: 'MT',
  15: 'ОД',
  16: 'У',
  17: 'УВ',
  18: 'УД',
  19: 'Р',
  20: 'ОЧ',
  21: 'ОЖ',
  22: 'ДО',
  24: 'ОЗ',
  25: 'Б',
  26: 'Т',
  27: 'ЛЧ',
  28: 'ВП',
  29: 'Г',
  31: 'ПР',
  32: 'НС',
  33: 'D',
  34: 'ЗБ',
  35: 'НН',
};

// id → i18n label key.
export const TIMESHEET_TYPE_LABEL: Record<number, string> = {
  1: 'messages.work.hours.daytime_evening',
  2: 'messages.work.hours.night',
  3: 'messages.work.hours.weekend_holiday',
  5: 'messages.work.hours.overtime',
  10: 'messages.work.trip.business',
  14: 'messages.work.leave.annual_paid',
  15: 'messages.work.leave.additional_paid',
  16: 'messages.work.leave.study_paid',
  17: 'messages.work.hours.reduced_for_students',
  18: 'messages.work.leave.unpaid_study',
  19: 'messages.work.leave.maternity',
  20: 'messages.work.leave.partial_childcare',
  21: 'messages.work.leave.unpaid_childcare',
  22: 'messages.work.leave.unpaid_admin_permission',
  24: 'messages.work.leave.unpaid_legal',
  25: 'messages.work.disability.temporary',
  26: 'messages.work.disability.unpaid',
  27: 'messages.work.hours.reduced_by_law',
  28: 'messages.work.downtime.not_workers_fault',
  29: 'messages.work.absence.full_day_legal',
  31: 'messages.work.absence.unexcused',
  32: 'messages.work.hours.unworked_admin',
  33: 'messages.work.days.official_holiday',
  34: 'messages.work.strike.legal',
  35: 'messages.work.absence.unclear',
};

// Laravel: in_array($case, [YA, N, RP, S, UV, LCH, NS])
export const TIMESHEET_TYPE_HOURS: Set<number> = new Set([
  1, 2, 3, 5, 17, 27, 32,
]);

// Stable iteration order as in Laravel enum declaration.
export const TIMESHEET_TYPE_IDS: number[] = [
  1, 2, 3, 5, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29,
  31, 32, 33, 34, 35,
];
