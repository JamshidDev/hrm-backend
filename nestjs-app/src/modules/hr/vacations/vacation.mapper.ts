// Vacation mapper. Laravel: VacationResource.

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import { VacationItemDto } from '@/modules/hr/vacations/dto/vacation.dto';
import type { VacationRow } from '@/modules/hr/vacations/vacation.types';

const VACATION_TYPE_KEYS: Record<number, string> = {
  1: 'messages.vacations.types.one',
  2: 'messages.vacations.types.two',
  3: 'messages.vacations.types.three',
  4: 'messages.vacations.types.four',
  5: 'messages.vacations.types.five',
  6: 'messages.vacations.types.six',
  7: 'messages.vacations.types.seven',
  8: 'messages.vacations.types.eight',
};

// Laravel `VacationTypeEnum::get($commandType)` — vacations.type stores CommandType value
// (41..55), bu funksiya CommandType → VacationCategory (1..8) mappingni amalga oshiradi.
export function commandTypeToVacationCategory(commandType: number): number {
  switch (commandType) {
    case 41:
    case 42:
    case 43:
    case 44:
    case 46:
      return 1;
    case 48:
      return 2;
    case 45:
    case 49:
      return 3;
    case 52:
      return 4;
    case 51:
      return 5;
    case 55:
      return 6;
    case 53:
      return 7;
    default:
      return 8;
  }
}

function tr(i18n: I18nService, key: string | undefined, lang: string): string {
  if (!key) return '';
  const v = i18n.t(key, { lang });
  return typeof v === 'string' ? v : '';
}

export const VacationMapper = {
  async toItem(
    this: void,
    r: VacationRow,
    today: string,
    i18n: I18nService,
    lang: string,
    minio: MinioService,
  ): Promise<VacationItemDto> {
    const vacationCat = commandTypeToVacationCategory(r.type);
    const typeLabel = tr(i18n, VACATION_TYPE_KEYS[vacationCat], lang);

    // Laravel: $diff = $to->diff($today); $days = $to->diffInDays($today);
    //   'all_day' => $diff->invert === 1 ? abs($days) : -abs($days)
    let allDay = 0;
    if (r.to) {
      const to = new Date(r.to);
      const today2 = new Date(today);
      allDay = Math.round(
        (to.getTime() - today2.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return {
      id: r.id,
      worker_position: r.wp_id
        ? {
            id: r.wp_id,
            worker: r.worker_id
              ? {
                  id: r.worker_id,
                  photo: await minio.fileUrl(r.worker_photo),
                  last_name: r.worker_last,
                  first_name: r.worker_first,
                  middle_name: r.worker_middle,
                }
              : null,
            organization: r.org_id
              ? {
                  id: r.org_id,
                  name:
                    lang === 'ru'
                      ? (r.org_name_ru ?? r.org_name)
                      : lang === 'en'
                        ? (r.org_name_en ?? r.org_name)
                        : r.org_name,
                  group: r.org_group ?? false,
                }
              : null,
            post_name: getFullPosition({
              position_name: r.pos_name,
              department_name: r.dept_name,
              department_level: r.dept_level,
              organization_full_name: r.org_full_name,
            }),
            post_short_name: getShortPosition({
              position_name: r.pos_name,
              department_name: r.dept_name,
              department_level: r.dept_level,
              organization_full_name: r.org_full_name,
            }),
          }
        : null,
      type: { id: r.type, name: typeLabel },
      from: r.from,
      to: r.to,
      work_day: r.work_day,
      rest_day: r.rest_day,
      main_day: r.main_day,
      second_day: r.second_day,
      all_day: allDay,
    };
  },
};
