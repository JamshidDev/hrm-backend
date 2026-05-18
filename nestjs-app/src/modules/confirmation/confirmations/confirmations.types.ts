// ConfirmationStatusEnum + ConfirmationTypeEnum mappings.

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
