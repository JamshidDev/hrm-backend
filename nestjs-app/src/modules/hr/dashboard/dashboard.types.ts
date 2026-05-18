// HR Dashboard helpers — vacation/contract type labels.

export const VACATION_TYPE_LABELS: Record<number, string> = {
  1: 'messages.vacations.types.one',
  2: 'messages.vacations.types.two',
  3: 'messages.vacations.types.three',
  4: 'messages.vacations.types.four',
  5: 'messages.vacations.types.five',
  6: 'messages.vacations.types.six',
  7: 'messages.vacations.types.seven',
  8: 'messages.vacations.types.eight',
};

// ContractTypeEnum (1..6) → minimized label key (Laravel: ContractTypeEnum::getMinimized).
export const CONTRACT_TYPE_MINIMIZED_LABELS: Record<number, string> = {
  1: 'messages.contract.minimized.indefinite',
  2: 'messages.contract.minimized.civil',
  3: 'messages.contract.minimized.part_time',
  4: 'messages.contract.minimized.remote',
  5: 'messages.contract.minimized.seasonal',
  6: 'messages.contract.minimized.fixed_term',
};

// PositionStatusEnum.
export const POSITION_STATUS = {
  ACTIVE: 2,
  FINISHED: 3,
} as const;

// ConfirmationStatusEnum.
export const CONFIRMATION_STATUS_SUCCESS = 3;

// Command → vacation type mapping (from CommandTypeEnum → VacationTypeEnum).
export const COMMAND_TO_VACATION_TYPE: Record<number, number> = {
  41: 1, 42: 1, 43: 1, 44: 1, 46: 1,
  45: 3, 49: 3,
  48: 2,
  51: 5,
  52: 4,
  53: 7,
  55: 6,
};

export function commandToVacationType(commandType: number): number {
  return COMMAND_TO_VACATION_TYPE[commandType] ?? 8;
}
