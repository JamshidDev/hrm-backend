// Command/Contract/Reason types — Laravel enum'larining NestJS portlari.

export interface EnumItem {
  id: number;
  name: string;
}

// ContractAdditionalTypeEnum (1..13) → i18n labels (Laravel: messages.contract_changes.*).
export const CONTRACT_ADDITIONAL_TYPE_LABELS: Record<number, string> = {
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

// ContractTypeEnum → ContractAdditional types subset (Laravel: getByContractAdditionalTypes).
// Default: [ONE, EIGHT, THIRTEEN]; TYPE=2 (civil) → [ONE, TWELVE].
export const CONTRACT_ADDITIONAL_BY_TYPE: Record<number, number[]> = {
  2: [1, 12],
};
export const CONTRACT_ADDITIONAL_DEFAULT_IDS = [1, 8, 13];

// CommandTypeEnum — barcha ID + i18n key.
export const COMMAND_TYPE_LABELS: Record<number, string> = {
  1: 'messages.command.employment.position_assignment',
  2: 'messages.command.employment.indefinite_hiring',
  3: 'messages.command.employment.fixed_term_hiring',
  4: 'messages.command.employment.competitive_hiring',
  5: 'messages.command.employment.position_commencement',
  6: 'messages.command.employment.temporary_replacement',
  7: 'messages.command.employment.part_time_hiring',
  8: 'messages.command.employment.reinstatement',
  21: 'messages.command.transfer.job_transfer',
  22: 'messages.command.transfer.relocation_due_to_employer',
  23: 'messages.command.transfer.temporary_assignment',
  24: 'messages.command.transfer.contractual_location_change',
  25: 'messages.command.transfer.working_conditions_change',
  31: 'messages.command.termination.mutual_agreement',
  32: 'messages.command.termination.contract_expiry',
  33: 'messages.command.termination.employee_initiative',
  34: 'messages.command.termination.employer_initiative',
  35: 'messages.command.termination.refusal_to_continue',
  36: 'messages.command.termination.refusal_new_conditions',
  37: 'messages.command.termination.refusal_relocation',
  38: 'messages.command.termination.medical_reasons',
  39: 'messages.command.termination.force_manure',
  41: 'messages.command.vacation.granting_leave',
  42: 'messages.command.vacation.rescheduling_leave',
  43: 'messages.command.vacation.extending_leave',
  44: 'messages.command.vacation.recalling_from_leave',
  45: 'messages.command.vacation.childcare_leave_3',
  46: 'messages.command.vacation.splitting_leave',
  47: 'messages.command.vacation.additional_paid_leave',
  48: 'messages.command.vacation.maternity_leave',
  49: 'messages.command.vacation.childcare_leave_2',
  50: 'messages.command.vacation.early_return_childcare',
  51: 'messages.command.vacation.creative_leave',
  52: 'messages.command.vacation.study_leave',
  53: 'messages.command.vacation.partial_paid_leave',
  54: 'messages.command.vacation.fully_paid_leave',
  55: 'messages.command.vacation.unpaid_leave',
  61: 'messages.command.business_trip.sixty_one',
  62: 'messages.command.business_trip.sixty_two',
  71: 'messages.command.others.seventy_one',
  72: 'messages.command.others.seventy_two',
  73: 'messages.command.others.seventy_three',
};

// CommandTypeEnum::getCommandTypes — ContractAdditional type → allowed Command type IDs.
export const COMMAND_TYPES_BY_CONTRACT_ADDITIONAL: Record<number, number[]> = {
  1: [25],
  8: [21],
  13: [31],
};
export const COMMAND_TYPES_DEFAULT_IDS = [
  32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
  52, 53, 54, 55, 61, 62, 71, 72, 73,
];

// CommandTypeEnum::getContractCommands — ContractType → Command type IDs.
export const COMMAND_TYPES_BY_CONTRACT_TYPE: Record<number, number[]> = {
  1: [2],
  3: [7],
  4: [3],
  5: [3],
  6: [3, 6],
};

// CommandReasonTypeEnum → labels (Laravel: __()'gacha bilan, NestJS: hardcoded — Laravel raw strings).
// Diqqat: Laravel __()'i tarjima qiladi, lekin keylar tarjima fayllarda yo'q — natijada
// Laravel `'pullik kompensatsiya bilan almashtirilsin'` ni qaytaradi.
export const COMMAND_REASON_TYPE_LABELS: Record<number, string> = {
  1: 'pullik kompensatsiya bilan almashtirilsin',
  2: 'mazkur ish yili davomida berilsin',
  3: 'xodimning keyingi ish yiliga ko‘chirilsin',
  4: "vaqtincha mehnatga layoqatsizlik ta'tilida",
  5: "o'quv ta'tilida",
  6: 'xomiladorlik va tug‘ish ta’tilida',
  7: 'ellik olti',
  8: 'tug‘ish qiyin kechgan yoxud ikki yoki undan ortiq bola tug‘ilgan taqdirda yetmish',
};

// CommandTypeEnum → ReasonType IDs subset.
export const REASON_TYPES_BY_COMMAND_TYPE: Record<number, number[]> = {
  44: [1, 2, 3],
  43: [4, 5, 6],
  48: [7, 8],
};

// ModelTypeEnum.CONTRACTS = 'contracts' (string).
export const MODEL_TYPE_CONTRACTS = 'contracts';
