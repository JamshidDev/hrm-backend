// Schedule mapper. Laravel: ScheduleResource + WorkDayInfoResource.
// SchedulesEnum: 1=DAILY, 2=WEEKLY, 3=SHIFT — i18n bilan o'giradi.
// WorkDayTypeEnum: 1=D (day), 2=N (night) — work_days uchun.

import type { I18nService } from 'nestjs-i18n';
import {
  ScheduleItemDto,
  ScheduleEnumItemDto,
  ScheduleWorkDayInfoDto,
} from '@/modules/structure/schedules/dto/schedule.dto';

// SchedulesEnum case names — lowercased trans key.
const SCHEDULE_TYPE_KEYS: Record<number, string> = {
  1: 'daily',
  2: 'weekly',
  3: 'shift',
};

// WorkDayTypeEnum case names — lowercased.
const WORK_DAY_TYPE_KEYS: Record<number, string> = {
  1: 'd',
  2: 'n',
};

export interface ScheduleRow {
  id: number;
  name: string | null;
  name_ru: string | null;
  name_en: string | null;
  type: number;
  work_days: WorkDayMinimal[];
}

export interface WorkDayMinimal {
  id: number;
  start_time: string | null;
  end_time: string | null;
  day_of_week: number;
  type: number;
}

function scheduleType(
  i18n: I18nService,
  id: number,
  lang: string,
): ScheduleEnumItemDto {
  const key = SCHEDULE_TYPE_KEYS[id];
  const name = key ? i18n.t(`messages.schedules.${key}`, { lang }) : '';
  return { id, name: typeof name === 'string' ? name : '' };
}

function workDayType(
  i18n: I18nService,
  id: number,
  lang: string,
): ScheduleEnumItemDto {
  const key = WORK_DAY_TYPE_KEYS[id];
  const name = key ? i18n.t(`messages.work_day.types.${key}`, { lang }) : '';
  return { id, name: typeof name === 'string' ? name : '' };
}

export const ScheduleMapper = {
  toItem(
    this: void,
    s: ScheduleRow,
    i18n: I18nService,
    lang: string,
  ): ScheduleItemDto {
    return {
      id: s.id,
      name: s.name,
      name_ru: s.name_ru,
      type: scheduleType(i18n, s.type, lang),
      work_days: s.work_days.map<ScheduleWorkDayInfoDto>((w) => ({
        id: w.id,
        start_time: w.start_time,
        end_time: w.end_time,
        type: workDayType(i18n, w.type, lang),
        day_of_week: w.day_of_week,
      })),
    };
  },
};
