// WorkDay mapper. Laravel: WorkDayResource (with full ScheduleResource).
//   - schedule: ScheduleResource (with type + work_days)
//   - type: WorkDayTypeEnum lookup

import type { I18nService } from 'nestjs-i18n';
import {
  ScheduleMapper,
  type ScheduleRow,
} from '@/modules/structure/schedules/schedule.mapper';
import {
  WorkDayItemDto,
  WorkDayEnumItemDto,
} from '@/modules/structure/work-days/dto/work-day.dto';

const WORK_DAY_TYPE_KEYS: Record<number, string> = {
  1: 'd',
  2: 'n',
};

export interface WorkDayRow {
  id: number;
  schedule_id: number;
  start_time: string | null;
  end_time: string | null;
  type: number;
  day_of_week: number;
  schedule: ScheduleRow | null;
}

function workDayType(
  i18n: I18nService,
  id: number,
  lang: string,
): WorkDayEnumItemDto {
  const key = WORK_DAY_TYPE_KEYS[id];
  const name = key ? i18n.t(`messages.work_day.types.${key}`, { lang }) : '';
  return { id, name: typeof name === 'string' ? name : '' };
}

export const WorkDayMapper = {
  toItem(
    this: void,
    w: WorkDayRow,
    i18n: I18nService,
    lang: string,
  ): WorkDayItemDto {
    return {
      id: w.id,
      // Laravel: new ScheduleResource($this->schedule) — to'liq Schedule (type + work_days bilan).
      schedule: w.schedule
        ? ScheduleMapper.toItem(w.schedule, i18n, lang)
        : null,
      start_time: w.start_time,
      end_time: w.end_time,
      type: workDayType(i18n, w.type, lang),
      day_of_week: w.day_of_week,
    };
  },
};
