// HR Dashboard DTO — read-only endpoints + org-scope query filters.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * GET /api/v1/hr/dashboard, /dashboard-two, /dashboard-three — org-scope filtrlari.
 * Laravel `filter($user, request()->all())` ekvivalenti.
 */
export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Vergulli tashkilot ID lari',
    example: '1,2',
  })
  @IsOptional()
  @IsString()
  organizations?: string;

  @ApiPropertyOptional({ description: 'Bitta tashkilot ID', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
}

export interface DashboardIndexResponse {
  workers_count: number;
  woman_count: number;
  mans_count: number;
  passports_count: number;
  passports_more_count: number;
  retired_men_count: number;
  retired_women_count: number;
  age_30_and_younger: number;
  age_31_to_45: number;
  age_46_and_older: number;
  higher_edu_count: number;
  middle_edu_count: number;
  special_edu_count: number;
  contracts: Array<{
    month: string;
    new_contracts: number;
    ended_contracts: number;
  }>;
  contract_types: Array<{ id: number; type: string; active_contracts: number }>;
  vacation_types: Array<{ id: number; name: string; active_vacations: number }>;
  positions_rate: number;
  worker_positions_rate: number;
  birthdays: {
    result: Array<{
      day: string;
      workers: Array<{
        id: number;
        last_name: string | null;
        first_name: string | null;
        middle_name: string | null;
        photo: string | null;
        birthday: string;
      }>;
      count: number;
      has_more: number;
    }>;
    all_workers: number;
    between: { to: string; from: string };
  };
}

export interface DashboardIndexTwoResponse {
  meds_finished: number;
  meds_approaching: number;
  disciplinary_actions: number;
  disciplinary_actions_fine_type: number | null;
  incentives: number;
  incentive_actions_gift_type: number | null;
}

export interface DashboardIndexThreeResponse {
  worker_disabilities: {
    total_count: number;
    levels: Array<{ level: number; count: number }>;
  };
  worker_relative_disabilities: {
    total_count: number;
    levels: Array<{ level: number; count: number }>;
  };
  worker_sick_leaves: {
    total_count: number;
    active_count: number;
    finished_count: number;
    types: Array<{ type: number; count: number }>;
  };
}
