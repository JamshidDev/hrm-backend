// VacationScheduleYear mapper. Laravel: VacationScheduleYearResource.

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import { VacationScheduleYearItemDto } from '@/modules/hr/vacation-schedule-years/dto/vacation-schedule-year.dto';
import type {
  VacationScheduleYearRow,
  VSYOrgRow,
  VSYConfirmationWorkerRow,
  VSYCreatorRow,
} from '@/modules/hr/vacation-schedule-years/vacation-schedule-year.types';

const CONFIRMATION_STATUS_KEYS: Record<number, string> = {
  1: 'messages.confirmation.status.process',
  2: 'messages.confirmation.status.read',
  3: 'messages.confirmation.status.success',
  4: 'messages.confirmation.status.rejected',
  5: 'messages.confirmation.status.deleted',
};

function tr(i18n: I18nService, key: string | undefined, lang: string): string {
  if (!key) return '';
  const v = i18n.t(key, { lang });
  return typeof v === 'string' ? v : '';
}

export const VacationScheduleYearMapper = {
  async toItem(
    this: void,
    r: VacationScheduleYearRow,
    org: VSYOrgRow | null,
    director: VSYConfirmationWorkerRow | null,
    tradeUnion: VSYConfirmationWorkerRow | null,
    creator: VSYCreatorRow | null,
    i18n: I18nService,
    lang: string,
    minio: MinioService,
  ): Promise<VacationScheduleYearItemDto> {
    const confKey = CONFIRMATION_STATUS_KEYS[r.confirmation];
    const confLabel = tr(i18n, confKey, lang);

    return {
      id: r.id,
      organization: org
        ? {
            id: org.id,
            name:
              lang === 'ru'
                ? (org.name_ru ?? org.name)
                : lang === 'en'
                  ? (org.name_en ?? org.name)
                  : org.name,
            // Laravel select: `organization:id,name,name_en,name_ru` — `group` NOT loaded.
            group: null,
          }
        : null,
      year: r.year,
      number: r.number,
      date: r.date,
      director: director
        ? {
            id: director.id,
            worker: director.worker_id
              ? {
                  id: director.worker_id,
                  photo: await minio.fileUrl(director.worker_photo),
                  last_name: director.worker_last,
                  first_name: director.worker_first,
                  middle_name: director.worker_middle,
                }
              : null,
            position: director.position,
          }
        : null,
      tradeUnion: tradeUnion
        ? {
            id: tradeUnion.id,
            worker: tradeUnion.worker_id
              ? {
                  id: tradeUnion.worker_id,
                  photo: await minio.fileUrl(tradeUnion.worker_photo),
                  last_name: tradeUnion.worker_last,
                  first_name: tradeUnion.worker_first,
                  middle_name: tradeUnion.worker_middle,
                }
              : null,
            position: tradeUnion.position,
          }
        : null,
      creator: creator
        ? {
            id: creator.id,
            worker: creator.worker_id
              ? {
                  id: creator.worker_id,
                  photo: await minio.fileUrl(creator.worker_photo),
                  last_name: creator.worker_last,
                  first_name: creator.worker_first,
                  middle_name: creator.worker_middle,
                }
              : null,
            post_name: getFullPosition({
              position_name: creator.pos_name,
              department_name: creator.dept_name,
              department_level: creator.dept_level,
              organization_full_name: creator.org_full_name,
            }),
            post_short_name: getShortPosition({
              position_name: creator.pos_name,
              department_name: creator.dept_name,
              department_level: creator.dept_level,
              organization_full_name: creator.org_full_name,
            }),
          }
        : null,
      file: await minio.fileUrl(r.file),
      confirmation_file: await minio.fileUrl(r.confirmation_file),
      generate: r.generate,
      confirmation: { id: r.confirmation, name: confLabel },
    };
  },
};
