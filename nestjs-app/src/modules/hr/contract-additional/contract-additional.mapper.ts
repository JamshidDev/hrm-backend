// ContractAdditional mapper. Laravel: ContractAdditionalResource.

import type { I18nService } from 'nestjs-i18n';
import type { MinioService } from '@/shared/minio/minio.service';
import { toLaravelTimestamp as toLaravelTs } from '@/common/utils/datetime.util';
import { ContractAdditionalItemDto } from '@/modules/hr/contract-additional/dto/contract-additional.dto';
import type { ContractAdditionalRow } from '@/modules/hr/contract-additional/contract-additional.types';

const CONTRACT_ADDITIONAL_TYPE_KEYS: Record<number, string> = {
  1: 'messages.contract_changes.employment_terms_change',
  2: 'messages.contract_changes.civil_contract_extension',
  3: 'messages.contract_changes.civil_contract_activity_change',
  4: 'messages.contract_changes.civil_contract_acceptance',
  5: 'messages.contract_changes.civil_contract_termination_agreement',
  6: 'messages.contract_changes.civil_contract_termination_notice',
  7: 'messages.contract_changes.civil_contract_termination_warning',
  8: 'messages.contract_changes.employee_transfer',
  9: 'messages.contract_changes.employer_relocation',
  10: 'messages.contract_changes.temporary_assignment',
  11: 'messages.contract_changes.workplace_change',
  12: 'messages.contract_changes.civil_contract_termination',
  13: 'messages.contract_changes.contract_termination',
};

const COMMAND_STATUS_KEYS: Record<number, string> = {
  1: 'messages.contract_command.status.not_created',
  2: 'messages.contract_command.status.formed',
  3: 'messages.contract_command.status.not_mandatory',
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

function orgName(r: ContractAdditionalRow, lang: string): string | null {
  if (lang === 'ru') return r.org_name_ru ?? r.org_name;
  if (lang === 'en') return r.org_name_en ?? r.org_name;
  return r.org_name;
}

export const ContractAdditionalMapper = {
  async toItem(
    this: void,
    r: ContractAdditionalRow,
    i18n: I18nService,
    lang: string,
    minio: MinioService,
  ): Promise<ContractAdditionalItemDto> {
    return {
      id: r.id,
      number: r.number,
      worker: r.worker_id
        ? {
            id: r.worker_id,
            // Laravel select limited columns; uuid/pin null.
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
      contract_to_date: r.contract_to_date,
      type: enumIdName(i18n, r.type, CONTRACT_ADDITIONAL_TYPE_KEYS, lang),
      command_status: enumIdName(
        i18n,
        r.command_status,
        COMMAND_STATUS_KEYS,
        lang,
      ),
      generate: r.generate,
      created_at: toLaravelTs(r.created_at),
      confirmation: enumIdName(
        i18n,
        r.confirmation,
        CONFIRMATION_STATUS_KEYS,
        lang,
      ),
    };
  },
};
