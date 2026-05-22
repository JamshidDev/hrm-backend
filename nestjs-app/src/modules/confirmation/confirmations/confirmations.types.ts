// ConfirmationStatusEnum + ConfirmationTypeEnum mappings.

import { COMMAND_TYPES } from '@/modules/structure/enums-endpoint/enums.constants';

export const CONFIRMATION_STATUS_LABELS: Record<number, string> = {
  1: 'messages.confirmation.status.process',
  2: 'messages.confirmation.status.read',
  3: 'messages.confirmation.status.success',
  4: 'messages.confirmation.status.rejected',
  5: 'messages.confirmation.status.deleted',
};

export const CONFIRMATION_TYPE_LABELS: Record<number, string> = {
  1: 'messages.confirmation.signature_methods.digital',
  2: 'messages.confirmation.signature_methods.biometric',
  3: 'messages.confirmation.signature_methods.button',
  4: 'messages.confirmation.signature_methods.not_confirmed',
};

export const CONFIRMATION_STATUS = {
  PROCESS: 1,
  READ: 2,
  SUCCESS: 3,
  REJECTED: 4,
  DELETED: 5,
} as const;

// ContractResource enum mappinglari (Laravel HR\Transformers\Contract\ContractResource).
export const CONTRACT_TYPE_LABELS: Record<number, string> = {
  1: 'messages.contract.employment_contract_indefinite',
  2: 'messages.contract.civil_labor_contract',
  3: 'messages.contract.employment_contract_part_time',
  4: 'messages.contract.employment_contract_remote',
  5: 'messages.contract.employment_contract_seasonal',
  6: 'messages.contract.employment_contract_fixed',
};

export const CONTRACT_COMMAND_STATUS_LABELS: Record<number, string> = {
  1: 'messages.contract_command.status.not_created',
  2: 'messages.contract_command.status.formed',
  3: 'messages.contract_command.status.not_mandatory',
};

export const POSITION_STATUS_LABELS: Record<number, string> = {
  1: 'messages.contract.status.process',
  2: 'messages.contract.status.active',
  3: 'messages.contract.status.finished',
};

// CommandTypeEnum mapping (Laravel HR\Enums\CommandTypeEnum::label()).
export const COMMAND_TYPE_LABELS: Record<number, string> = Object.fromEntries(
  COMMAND_TYPES.map((c) => [c.id, c.key]),
);
