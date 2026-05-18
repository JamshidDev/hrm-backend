// DocumentType modullari uchun enum maps — numeric type → i18n translation key.
// Bu mapping `enums.constants.ts`'dagi bilan parallel — Laravel cases() tartibida.

// ContractTypeEnum: 1..6 (contract-types va command-types BIR XIL enum ishlatadi!)
export const CONTRACT_TYPE_ENUM_MAP: Record<number, string> = {
  1: 'messages.contract.employment_contract_indefinite',
  2: 'messages.contract.civil_labor_contract',
  3: 'messages.contract.employment_contract_part_time',
  4: 'messages.contract.employment_contract_remote',
  5: 'messages.contract.employment_contract_seasonal',
  6: 'messages.contract.employment_contract_fixed',
};

// ContractAdditionalTypeEnum: 1..13 — contract_changes.
export const CONTRACT_ADDITIONAL_TYPE_ENUM_MAP: Record<number, string> = {
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
