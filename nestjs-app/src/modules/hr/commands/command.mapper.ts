// Command mapper. Laravel: CommandResource.

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import { toLaravelTimestamp as toLaravelTs } from '@/common/utils/datetime.util';
import { COMMAND_TYPES } from '@/modules/structure/enums-endpoint/enums.constants';
import { CommandItemDto } from '@/modules/hr/commands/dto/command.dto';
import type {
  CommandRow,
  CommandWorkerConfirmationRow,
} from '@/modules/hr/commands/command.types';

const COMMAND_TYPE_KEYS: Record<number, string> = Object.fromEntries(
  COMMAND_TYPES.map((c) => [c.id, c.key]),
);

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

function enumIdName(
  i18n: I18nService,
  id: number | null | undefined,
  keys: Record<number, string>,
  lang: string,
): { id: number; name: string } {
  const key = id != null ? keys[id] : undefined;
  return { id: id ?? 0, name: tr(i18n, key, lang) };
}

function orgName(r: CommandRow, lang: string): string | null {
  if (lang === 'ru') return r.org_name_ru ?? r.org_name;
  if (lang === 'en') return r.org_name_en ?? r.org_name;
  return r.org_name;
}

export const CommandMapper = {
  async toItem(
    this: void,
    c: CommandRow,
    workerConfirmations: CommandWorkerConfirmationRow[],
    i18n: I18nService,
    lang: string,
    minio: MinioService,
  ): Promise<CommandItemDto> {
    const workersList = await Promise.all(
      workerConfirmations.map(async (w) => ({
        id: w.id,
        worker: w.worker_id
          ? {
              id: w.worker_id,
              photo: await minio.fileUrl(w.worker_photo),
              last_name: w.worker_last,
              first_name: w.worker_first,
              middle_name: w.worker_middle,
            }
          : null,
        position: w.position,
      })),
    );

    return {
      id: c.id,
      command_number: c.command_number,
      command_date: c.command_date,
      workers: workersList,
      type: enumIdName(i18n, c.type, COMMAND_TYPE_KEYS, lang),
      file: await minio.fileUrl(c.file),
      confirmation_file: await minio.fileUrl(c.confirmation_file),
      organization: c.organization_id
        ? {
            id: c.organization_id,
            name: orgName(c, lang),
            group: c.org_group ?? false,
          }
        : null,
      generate: c.generate,
      created_at: toLaravelTs(c.created_at),
      confirmation: enumIdName(i18n, c.confirmation, CONFIRMATION_STATUS_KEYS, lang),
    };
  },
};
