// ConfirmationStatusEnum (Laravel) + ConfirmationTypeEnum mappings.

// status (1..5) → i18n key
export const CONFIRMATION_STATUS_KEY: Record<number, string> = {
  1: 'messages.confirmation.status.process',
  2: 'messages.confirmation.status.read',
  3: 'messages.confirmation.status.success',
  4: 'messages.confirmation.status.rejected',
  5: 'messages.confirmation.status.deleted',
};

// confirmation_type (1..4) → i18n key
export const CONFIRMATION_TYPE_KEY: Record<number, string> = {
  1: 'messages.confirmation.signature_methods.digital',
  2: 'messages.confirmation.signature_methods.biometric',
  3: 'messages.confirmation.signature_methods.button',
  4: 'messages.confirmation.signature_methods.not_confirmed',
};
