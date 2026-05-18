// WorkerRelative mapper. Laravel: WorkerRelativeResource.
// Relative (id+name i18n), relative_worker (WorkerInfoResource), disabilities[].

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import {
  WorkerRelativeItemDto,
  WorkerRelativeWorkerMinDto,
  WorkerRelativeDisabilityDto,
} from '@/modules/hr/worker-relatives/dto/worker-relative.dto';
import type {
  WorkerRelativeRow,
  WorkerRelativeWorkerRow,
  WorkerRelativeDisabilityRow,
} from '@/modules/hr/worker-relatives/worker-relative.types';

// RelativeEnum 1..15 → `messages.family.{one..fifteen}`.
const RELATIVE_KEYS: Record<number, string> = {
  1: 'messages.family.one',
  2: 'messages.family.two',
  3: 'messages.family.three',
  4: 'messages.family.four',
  5: 'messages.family.five',
  6: 'messages.family.six',
  7: 'messages.family.seven',
  8: 'messages.family.eight',
  9: 'messages.family.nine',
  10: 'messages.family.ten',
  11: 'messages.family.eleven',
  12: 'messages.family.twelve',
  13: 'messages.family.thirteen',
  14: 'messages.family.fourteen',
  15: 'messages.family.fifteen',
};

function tr(i18n: I18nService, key: string | undefined, lang: string): string {
  if (!key) return '';
  const v = i18n.t(key, { lang });
  return typeof v === 'string' ? v : '';
}

export const WorkerRelativeMapper = {
  async toItem(
    this: void,
    r: WorkerRelativeRow,
    relativeWorker: WorkerRelativeWorkerRow | null,
    disabilities: WorkerRelativeDisabilityRow[],
    i18n: I18nService,
    lang: string,
    minio: MinioService,
  ): Promise<WorkerRelativeItemDto> {
    let relativeWorkerDto: WorkerRelativeWorkerMinDto | null = null;
    if (relativeWorker) {
      relativeWorkerDto = {
        id: relativeWorker.id,
        uuid: relativeWorker.uuid,
        photo: await minio.fileUrl(relativeWorker.photo),
        last_name: relativeWorker.last_name,
        first_name: relativeWorker.first_name,
        middle_name: relativeWorker.middle_name,
        birthday: relativeWorker.birthday,
        pin: relativeWorker.pin,
      };
    }

    return {
      id: r.id,
      relative: {
        id: r.relative,
        name: tr(i18n, RELATIVE_KEYS[r.relative], lang),
      },
      relative_worker: relativeWorkerDto,
      birthday: r.birthday,
      last_name: r.last_name,
      first_name: r.first_name,
      middle_name: r.middle_name,
      birth_place: r.birth_place,
      post_name: r.post_name,
      address: r.address,
      disabilities: disabilities.map(
        (d): WorkerRelativeDisabilityDto => ({
          id: d.id,
          level: d.level,
          number: d.number,
          from: d.from,
          to: d.to,
          comment: d.comment,
        }),
      ),
    };
  },
};
