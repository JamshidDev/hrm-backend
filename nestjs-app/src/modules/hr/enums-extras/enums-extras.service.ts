// HR Enum extras service.
// Laravel: HRController::contractAdditionalTypes(), getCommandTypes(), getReasonTypes().

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RequestContext } from '@/common/context/request.context';
import {
  CONTRACT_ADDITIONAL_TYPE_LABELS,
  CONTRACT_ADDITIONAL_BY_TYPE,
  CONTRACT_ADDITIONAL_DEFAULT_IDS,
  COMMAND_TYPE_LABELS,
  COMMAND_TYPES_BY_CONTRACT_ADDITIONAL,
  COMMAND_TYPES_DEFAULT_IDS,
  COMMAND_TYPES_BY_CONTRACT_TYPE,
  COMMAND_REASON_TYPE_LABELS,
  REASON_TYPES_BY_COMMAND_TYPE,
  MODEL_TYPE_CONTRACTS,
  EnumItem,
} from '@/modules/hr/enums-extras/enums-extras.types';

@Injectable()
export class EnumsExtrasService {
  constructor(
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  // GET /api/v1/hr/enums/contract-additional-types?contract_type=2
  contractAdditionalTypes(contractType?: number): EnumItem[] {
    const lang = this.ctx.lang;
    const ids =
      contractType != null && CONTRACT_ADDITIONAL_BY_TYPE[contractType]
        ? CONTRACT_ADDITIONAL_BY_TYPE[contractType]
        : CONTRACT_ADDITIONAL_DEFAULT_IDS;
    return ids.map((id) => ({
      id,
      name: this.tr(CONTRACT_ADDITIONAL_TYPE_LABELS[id], lang),
    }));
  }

  // GET /api/v1/hr/enums/command-types?status=&type=
  // Laravel: status === 'contracts' → getContractCommands($type); else getCommandTypes($type).
  commandTypes(status?: string, type?: number): EnumItem[] {
    const lang = this.ctx.lang;
    if (status === MODEL_TYPE_CONTRACTS) {
      const ids =
        type != null && COMMAND_TYPES_BY_CONTRACT_TYPE[type]
          ? COMMAND_TYPES_BY_CONTRACT_TYPE[type]
          : [];
      return ids.map((id) => ({
        id,
        name: this.tr(COMMAND_TYPE_LABELS[id], lang),
      }));
    }
    // Default: getCommandTypes(contractAdditionalType).
    const ids =
      type != null && COMMAND_TYPES_BY_CONTRACT_ADDITIONAL[type]
        ? COMMAND_TYPES_BY_CONTRACT_ADDITIONAL[type]
        : COMMAND_TYPES_DEFAULT_IDS;
    return ids.map((id) => ({
      id,
      name: this.tr(COMMAND_TYPE_LABELS[id], lang),
    }));
  }

  // GET /api/v1/hr/enums/reason-types?type=44
  reasonTypes(type?: number): EnumItem[] {
    const ids =
      type != null && REASON_TYPES_BY_COMMAND_TYPE[type]
        ? REASON_TYPES_BY_COMMAND_TYPE[type]
        : [];
    return ids.map((id) => ({
      id,
      name: COMMAND_REASON_TYPE_LABELS[id] ?? '',
    }));
  }

  private tr(key: string | undefined, lang: string): string {
    if (!key) return '';
    const val = this.i18n.t(key, { lang });
    return typeof val === 'string' ? val : '';
  }
}
