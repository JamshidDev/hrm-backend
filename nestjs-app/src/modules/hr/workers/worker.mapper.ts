// Worker mapper. Laravel resources:
//   - WorkerInfoResource         (id+uuid+photo+names+birthday+pin)
//   - WorkerWithPositionResource (+ positions array)

import {
  WorkerInfoDto,
  WorkerPositionMinDto,
  WorkerWithPositionDto,
} from '@/modules/hr/workers/dto/worker.dto';

export interface WorkerRow {
  id: number;
  uuid: string;
  photo: string | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  birthday: string;
  pin: number | null;
}

export interface WorkerPositionRow {
  id: number;
  type: number;
  organization_full_name: string | null;
  position_name: string | null;
  department_name: string | null;
  position_date: string | null;
}

export const WorkerMapper = {
  // WorkerInfoResource shape.
  async toInfo(
    this: void,
    w: WorkerRow,
    fileUrl: (path: string | null) => Promise<string | null>,
  ): Promise<WorkerInfoDto> {
    return {
      id: w.id,
      uuid: w.uuid,
      photo: await fileUrl(w.photo),
      last_name: w.last_name,
      first_name: w.first_name,
      middle_name: w.middle_name,
      birthday: w.birthday,
      pin: w.pin,
    };
  },

  // Position mini (Laravel WorkerWithPositionResource'da inline).
  toPositionMin(
    this: void,
    p: WorkerPositionRow,
    typeLabel: string,
  ): WorkerPositionMinDto {
    return {
      id: p.id,
      type: typeLabel,
      organization: p.organization_full_name,
      position: p.position_name,
      department: p.department_name,
      position_date: p.position_date,
      // `hrs` — Laravel sanctum auth da to'ldiradi. NestJS hozircha skip.
      hrs: null,
    };
  },

  async toWithPosition(
    this: void,
    w: WorkerRow,
    positions: WorkerPositionMinDto[],
    fileUrl: (path: string | null) => Promise<string | null>,
  ): Promise<WorkerWithPositionDto> {
    return {
      id: w.id,
      uuid: w.uuid,
      photo: await fileUrl(w.photo),
      last_name: w.last_name,
      first_name: w.first_name,
      middle_name: w.middle_name,
      birthday: w.birthday,
      positions,
    };
  },
};

// ContractTypeEnum labelMinimized — i18n keys (used by WorkerPositionResource).
export const CONTRACT_TYPE_MIN_KEYS: Record<number, string> = {
  1: 'messages.contract.minimeze_employment_contract_indefinite',
  2: 'messages.contract.minimeze_civil_labor_contract',
  3: 'messages.contract.minimeze_employment_contract_part_time',
  4: 'messages.contract.minimeze_employment_contract_remote',
  5: 'messages.contract.minimeze_employment_contract_seasonal',
  6: 'messages.contract.minimeze_employment_contract_fixed',
};

// ContractTypeEnum label — full text (used by WorkerWithPositionResource).
export const CONTRACT_TYPE_FULL_KEYS: Record<number, string> = {
  1: 'messages.contract.employment_contract_indefinite',
  2: 'messages.contract.civil_labor_contract',
  3: 'messages.contract.employment_contract_part_time',
  4: 'messages.contract.employment_contract_remote',
  5: 'messages.contract.employment_contract_seasonal',
  6: 'messages.contract.employment_contract_fixed',
};
