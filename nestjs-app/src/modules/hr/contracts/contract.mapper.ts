// Contract mapper. Laravel: ContractResource.

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import { toLaravelTimestamp as toLaravelTs } from '@/common/utils/datetime.util';
import { ContractItemDto } from '@/modules/hr/contracts/dto/contract.dto';
import type { ContractRow } from '@/modules/hr/contracts/contract.types';

const CONTRACT_TYPE_KEYS: Record<number, string> = {
  1: 'messages.contract.employment_contract_indefinite',
  2: 'messages.contract.civil_labor_contract',
  3: 'messages.contract.employment_contract_part_time',
  4: 'messages.contract.employment_contract_remote',
  5: 'messages.contract.employment_contract_seasonal',
  6: 'messages.contract.employment_contract_fixed',
};

const CONTRACT_COMMAND_STATUS_KEYS: Record<number, string> = {
  1: 'messages.contract_command.status.not_created',
  2: 'messages.contract_command.status.formed',
  3: 'messages.contract_command.status.not_mandatory',
};

const POSITION_STATUS_KEYS: Record<number, string> = {
  1: 'messages.contract.status.process',
  2: 'messages.contract.status.active',
  3: 'messages.contract.status.finished',
};

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

function orgName(r: ContractRow, lang: string): string | null {
  if (lang === 'ru') return r.org_name_ru ?? r.org_name;
  if (lang === 'en') return r.org_name_en ?? r.org_name;
  return r.org_name;
}

export const ContractMapper = {
  async toItem(
    this: void,
    r: ContractRow,
    i18n: I18nService,
    lang: string,
    minio: MinioService,
  ): Promise<ContractItemDto> {
    return {
      id: r.id,
      number: r.number,
      // Laravel `with('worker:id,first_name,last_name,middle_name,birthday,photo')` —
      // uuid/pin loaded EMAS, shu sababli null.
      worker: r.worker_id
        ? {
            id: r.worker_id,
            uuid: null,
            photo: await minio.fileUrl(r.worker_photo),
            last_name: r.worker_last,
            first_name: r.worker_first,
            middle_name: r.worker_middle,
            birthday: r.worker_birthday,
            pin: null,
          }
        : null,
      organization: r.org_id
        ? { id: r.org_id, name: orgName(r, lang), group: r.org_group ?? false }
        : null,
      file: await minio.fileUrl(r.file),
      confirmation_file: await minio.fileUrl(r.confirmation_file),
      contract_date: r.contract_date,
      type: enumIdName(i18n, r.type, CONTRACT_TYPE_KEYS, lang),
      command_status: enumIdName(
        i18n,
        r.command_status,
        CONTRACT_COMMAND_STATUS_KEYS,
        lang,
      ),
      status: enumIdName(i18n, r.status, POSITION_STATUS_KEYS, lang),
      confirmation: enumIdName(
        i18n,
        r.confirmation,
        CONFIRMATION_STATUS_KEYS,
        lang,
      ),
      generate: r.generate,
      created_at: toLaravelTs(r.created_at),
      creator: r.user_id,
    };
  },
};
