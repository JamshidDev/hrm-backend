// Laravel Modules/Economist/Enums ekvivalentlari.
// UploadTypeEnum: 1..4 (statementlar / tax-four / tax-five / pension)
// UploadStatusEnum: 1..4 (process / reloaded / success / error)

export const UploadType = {
  STATEMENTS: 1,
  TAX_FOUR: 2,
  TAX_FIVE: 3,
  PENSION_PAYMENTS: 4,
} as const;

export const UploadStatus = {
  PROCESS: 1,
  RELOADED: 2,
  SUCCESS: 3,
  ERROR: 4,
} as const;

export type UploadTypeValue = (typeof UploadType)[keyof typeof UploadType];
export type UploadStatusValue =
  (typeof UploadStatus)[keyof typeof UploadStatus];

// label'lar — Laravel i18n key'larga mos. Frontend uchun nomlar.
const UPLOAD_TYPE_LABELS_UZ: Record<UploadTypeValue, string> = {
  [UploadType.STATEMENTS]: 'Statementlar',
  [UploadType.TAX_FOUR]: 'Soliq-4',
  [UploadType.TAX_FIVE]: 'Soliq-5',
  [UploadType.PENSION_PAYMENTS]: 'Pension to`lovlar',
};

const UPLOAD_STATUS_LABELS_UZ: Record<UploadStatusValue, string> = {
  [UploadStatus.PROCESS]: 'Jarayonda',
  [UploadStatus.RELOADED]: 'Qayta yuklangan',
  [UploadStatus.SUCCESS]: 'Muvaffaqiyatli',
  [UploadStatus.ERROR]: 'Xato',
};

/** UploadTypeEnum::list() ekvivalenti. */
export function uploadTypesList() {
  return Object.entries(UPLOAD_TYPE_LABELS_UZ).map(([id, name]) => ({
    id: Number(id),
    name,
  }));
}

/** UploadStatusEnum::list() ekvivalenti. */
export function uploadStatusesList() {
  return Object.entries(UPLOAD_STATUS_LABELS_UZ).map(([id, name]) => ({
    id: Number(id),
    name,
  }));
}

/** Refresh table — string type to'g'ri jadval nomiga. */
export function resolveRefreshTable(type: string): string {
  const map: Record<string, string> = {
    statements: 'statements',
    'tax-four-applications': 'tax_four_applications',
    tax_four_applications: 'tax_four_applications',
    'tax-five-applications': 'tax_five_applications',
    tax_five_applications: 'tax_five_applications',
    'pension-payments': 'pension_payments',
    pension_payments: 'pension_payments',
  };
  const table = map[type];
  if (!table) throw new Error(`Unknown refresh type: ${type}`);
  return table;
}
