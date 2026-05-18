// Enum kolleksiyalari — Laravel StructureController::enums() ekvivalenti.
// Har enum: {id: number|string, translationKey: string}[].
// Mapper i18n.t() bilan name'larni keltirib chiqaradi.

// ContractTypeEnum (HR): 1..6
export const CONTRACT_TYPES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.contract.employment_contract_indefinite' },
  { id: 2, key: 'messages.contract.civil_labor_contract' },
  { id: 3, key: 'messages.contract.employment_contract_part_time' },
  { id: 4, key: 'messages.contract.employment_contract_remote' },
  { id: 5, key: 'messages.contract.employment_contract_seasonal' },
  { id: 6, key: 'messages.contract.employment_contract_fixed' },
];

// OrganizationServiceEnum: e-signature, sms-service (hardcoded, translation yo'q).
export const ORGANIZATION_SERVICES: { id: string; name: string }[] = [
  { id: 'e-signature', name: 'E-imzo' },
  { id: 'sms-service', name: 'Eskiz sms' },
];

// PositionCategoryEnum: B, M, T, ICH, XK (1..5)
export const POSITION_CATEGORIES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.position_categories.b' },
  { id: 2, key: 'messages.position_categories.m' },
  { id: 3, key: 'messages.position_categories.t' },
  { id: 4, key: 'messages.position_categories.ich' },
  { id: 5, key: 'messages.position_categories.xk' },
];

// SchedulesEnum: DAILY, WEEKLY, SHIFT
export const SCHEDULES_TYPES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.schedules.daily' },
  { id: 2, key: 'messages.schedules.weekly' },
  { id: 3, key: 'messages.schedules.shift' },
];

// WorkDayTypeEnum: D, N
export const WORK_DAY_TYPES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.work_day.types.d' },
  { id: 2, key: 'messages.work_day.types.n' },
];

// CommandTypeEnum — Laravel 8 + 5 + 9 + 16 + 2 + 3 = 43 cases.
// Tartibni Laravel cases() bilan ekzakt mos qilamiz.
export const COMMAND_TYPES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.command.employment.position_assignment' },
  { id: 2, key: 'messages.command.employment.indefinite_hiring' },
  { id: 3, key: 'messages.command.employment.fixed_term_hiring' },
  { id: 4, key: 'messages.command.employment.competitive_hiring' },
  { id: 5, key: 'messages.command.employment.position_commencement' },
  { id: 6, key: 'messages.command.employment.temporary_replacement' },
  { id: 7, key: 'messages.command.employment.part_time_hiring' },
  { id: 8, key: 'messages.command.employment.reinstatement' },

  { id: 21, key: 'messages.command.transfer.job_transfer' },
  { id: 22, key: 'messages.command.transfer.relocation_due_to_employer' },
  { id: 23, key: 'messages.command.transfer.temporary_assignment' },
  { id: 24, key: 'messages.command.transfer.contractual_location_change' },
  { id: 25, key: 'messages.command.transfer.working_conditions_change' },

  { id: 31, key: 'messages.command.termination.mutual_agreement' },
  { id: 32, key: 'messages.command.termination.contract_expiry' },
  { id: 33, key: 'messages.command.termination.employee_initiative' },
  { id: 34, key: 'messages.command.termination.employer_initiative' },
  { id: 35, key: 'messages.command.termination.refusal_to_continue' },
  { id: 36, key: 'messages.command.termination.refusal_new_conditions' },
  { id: 37, key: 'messages.command.termination.refusal_relocation' },
  { id: 38, key: 'messages.command.termination.medical_reasons' },
  { id: 39, key: 'messages.command.termination.force_manure' },

  { id: 41, key: 'messages.command.vacation.granting_leave' },
  { id: 42, key: 'messages.command.vacation.rescheduling_leave' },
  { id: 43, key: 'messages.command.vacation.extending_leave' },
  { id: 44, key: 'messages.command.vacation.recalling_from_leave' },
  // Laravel enum tartibi: 45 case'i 'childcare_leave_3' — vacation block oxirida,
  // lekin enum cases ketma-ketligi bo'yicha 45 → 'childcare_leave_3'.
  { id: 45, key: 'messages.command.vacation.childcare_leave_3' },
  { id: 46, key: 'messages.command.vacation.splitting_leave' },
  { id: 47, key: 'messages.command.vacation.additional_paid_leave' },
  { id: 48, key: 'messages.command.vacation.maternity_leave' },
  { id: 49, key: 'messages.command.vacation.childcare_leave_2' },
  { id: 50, key: 'messages.command.vacation.early_return_childcare' },
  { id: 51, key: 'messages.command.vacation.creative_leave' },
  { id: 52, key: 'messages.command.vacation.study_leave' },
  { id: 53, key: 'messages.command.vacation.partial_paid_leave' },
  { id: 54, key: 'messages.command.vacation.fully_paid_leave' },
  { id: 55, key: 'messages.command.vacation.unpaid_leave' },

  { id: 61, key: 'messages.command.business_trip.sixty_one' },
  { id: 62, key: 'messages.command.business_trip.sixty_two' },

  { id: 71, key: 'messages.command.others.seventy_one' },
  { id: 72, key: 'messages.command.others.seventy_two' },
  { id: 73, key: 'messages.command.others.seventy_three' },
];

// ConfirmationStatusEnum: 1..5
export const CONFIRMATION_STATUSES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.confirmation.status.process' },
  { id: 2, key: 'messages.confirmation.status.read' },
  { id: 3, key: 'messages.confirmation.status.success' },
  { id: 4, key: 'messages.confirmation.status.rejected' },
  { id: 5, key: 'messages.confirmation.status.deleted' },
];

// HolidayTypeEnum: 1, 2
export const HOLIDAY_TYPES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.holidays.types.one' },
  { id: 2, key: 'messages.holidays.types.two' },
];

// UniversityTypeEnum: 1..6
export const UNIVERSITY_TYPES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.education.types.one' },
  { id: 2, key: 'messages.education.types.two' },
  { id: 3, key: 'messages.education.types.three' },
  { id: 4, key: 'messages.education.types.four' },
  { id: 5, key: 'messages.education.types.five' },
  { id: 6, key: 'messages.education.types.six' },
];

// EducationEnum: 1..3
export const EDUCATION_TYPES: { id: number; key: string }[] = [
  { id: 1, key: 'messages.education.level.one' },
  { id: 2, key: 'messages.education.level.two' },
  { id: 3, key: 'messages.education.level.three' },
];
