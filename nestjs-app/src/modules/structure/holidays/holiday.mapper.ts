// Holiday mapper. Laravel: HolidayResource.
// HolidayTypeEnum: 1=ONE (public), 2=TWO (weekend) — i18n bilan.

import type { I18nService } from 'nestjs-i18n';
import { holidays } from '@/db/schema';
import {
  HolidayItemDto,
  HolidayEnumItemDto,
} from '@/modules/structure/holidays/dto/holiday.dto';

const HOLIDAY_TYPE_KEYS: Record<number, string> = {
  1: 'one',
  2: 'two',
};

function holidayType(
  i18n: I18nService,
  id: number,
  lang: string,
): HolidayEnumItemDto {
  const key = HOLIDAY_TYPE_KEYS[id];
  const name = key ? i18n.t(`messages.holidays.types.${key}`, { lang }) : '';
  return { id, name: typeof name === 'string' ? name : '' };
}

export const HolidayMapper = {
  toItem(
    this: void,
    h: typeof holidays.$inferSelect,
    i18n: I18nService,
    lang: string,
  ): HolidayItemDto {
    return {
      id: h.id,
      name: h.name,
      holiday_date: h.holiday_date,
      type: holidayType(i18n, h.type, lang),
    };
  },
};
