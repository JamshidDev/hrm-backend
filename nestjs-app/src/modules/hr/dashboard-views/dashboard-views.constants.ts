// HR Dashboard Views — konstantalar (magic raqamlar bir joyda).

// PositionStatusEnum.
export const ACTIVE_POSITION_STATUS = 2;
export const FINISHED_POSITION_STATUS = 3;

// ConfirmationStatusEnum::SUCCESS.
export const CONFIRMATION_SUCCESS = 3;

// Pagination default (Laravel: paginate(request('per_page', 10))).
export const DEFAULT_PER_PAGE = 10;

// Pensiya yoshi — interval (yil).
export const PENSION_INTERVAL = {
  MALE: '60 years',
  FEMALE: '55 years',
} as const;

// ContractTypeEnum::get(int) — to'liq label i18n kalitlari (1..6).
export const CONTRACT_TYPE_LABEL_KEYS: Record<number, string> = {
  1: 'messages.contract.employment_contract_indefinite',
  2: 'messages.contract.civil_labor_contract',
  3: 'messages.contract.employment_contract_part_time',
  4: 'messages.contract.employment_contract_remote',
  5: 'messages.contract.employment_contract_seasonal',
  6: 'messages.contract.employment_contract_fixed',
};

// RelativeEnum::get — qarindoshlik turi label (1..15).
export const RELATIVE_LABELS: Record<number, string> = {
  1: 'Otasi',
  2: 'Onasi',
  3: 'Akasi',
  4: 'Opasi',
  5: "Turmush o'rtog'i",
  6: 'Ukasi',
  7: 'Singlisi',
  8: "O'g'li",
  9: 'Qizi',
  10: 'Qaynotasi',
  11: 'Qaynonasi',
  12: 'Qaynakasi',
  13: 'Qaynopasi',
  14: 'Qaynukasi',
  15: 'Qaynsingli',
};

// PositionStatusEnum::get — shartnoma/lavozim holati label (1..3).
export const POSITION_STATUS_LABEL_KEYS: Record<number, string> = {
  1: 'messages.contract.status.process',
  2: 'messages.contract.status.active',
  3: 'messages.contract.status.finished',
};
