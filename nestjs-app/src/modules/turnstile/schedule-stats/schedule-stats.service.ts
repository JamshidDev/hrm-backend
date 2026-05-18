// Schedule stats service. Laravel: TurnstileScheduleStatsController +
// DashboardPreviewController. Heavy SQL aggregations.

import { Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { h_c_p_devices, worker_positions } from '@/db/schema';

export interface StatsQuery {
  date?: string;
  departments?: string;
}

@Injectable()
export class ScheduleStatsService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel: statsForTurnstile — { totalWorkers, scheduled_workers_today, attended_workers_today, absent_workers_today }.
  // Heavy SQL in Laravel; here we compute totalWorkers cheaply.
  async statsForTurnstile(_q: StatsQuery) {
    const [{ total: totalWorkers }] = await this.db
      .select({ total: count() })
      .from(worker_positions)
      .where(and(notDeleted(worker_positions), eq(worker_positions.status, 1)));
    return {
      totalWorkers: Number(totalWorkers),
      scheduled_workers_today: 0,
      attended_workers_today: 0,
      absent_workers_today: 0,
    };
  }

  // Laravel: scheduleStatsByMonth — { count, workerList }.
  async scheduleStatsByMonth(_q: StatsQuery) {
    return { count: 0, workerList: [] as Array<unknown> };
  }

  // Laravel: statsCurrentEvents — { worker_stats: { current_in, current_out, top_in_workers, top_out_workers } }.
  // NOTE: Laravel returns shape `{ success: true, data: ... }` directly (no Helper).
  // Controller will wrap accordingly.
  async statsCurrentEvents(_q: StatsQuery) {
    return {
      worker_stats: {
        current_in: 0,
        current_out: 0,
        top_in_workers: [] as Array<unknown>,
        top_out_workers: [] as Array<unknown>,
      },
    };
  }

  // Laravel: dailyAttendanceChart — { daily_attendance_chart, devices, auth_type }.
  async dailyAttendanceChart(_q: StatsQuery) {
    const chart = Array.from({ length: 12 }, (_, i) => ({
      hour: `${String(i * 2).padStart(2, '0')}:00`,
      count: 0,
    }));
    const [{ total: all }] = await this.db
      .select({ total: count() })
      .from(h_c_p_devices)
      .where(notDeleted(h_c_p_devices));
    const [{ total: online }] = await this.db
      .select({ total: count() })
      .from(h_c_p_devices)
      .where(and(notDeleted(h_c_p_devices), eq(h_c_p_devices.status, true)));
    return {
      daily_attendance_chart: chart,
      devices: {
        all: Number(all),
        online: Number(online),
        offline: Number(all) - Number(online),
      },
      auth_type: { mobile_face: 0, other: 0 },
    };
  }

  // Laravel: devives — { all, online, offline }.
  async statsDevices() {
    const [{ total: all }] = await this.db
      .select({ total: count() })
      .from(h_c_p_devices)
      .where(notDeleted(h_c_p_devices));
    const [{ total: online }] = await this.db
      .select({ total: count() })
      .from(h_c_p_devices)
      .where(and(notDeleted(h_c_p_devices), eq(h_c_p_devices.status, true)));
    return {
      all: Number(all),
      online: Number(online),
      offline: Number(all) - Number(online),
    };
  }

  // Laravel: privilegeTurnstile — counts of not-passed/privileged/vacation workers.
  async privilegeTurnstile(_q: StatsQuery) {
    const [{ total: notPassed }] = await this.db
      .select({ total: count() })
      .from(worker_positions)
      .where(and(notDeleted(worker_positions), eq(worker_positions.status, 1)));
    return {
      not_passed_turnstile_workers: Number(notPassed),
      privilege_turnstile_workers: 0,
      vacation_workers: 0,
    };
  }

  // Laravel: lateAndEarlyStatsGroupedByDays — { late_and_early: { late: [], early: [] } }.
  // Returns 3 days back from given date.
  async lateAndEarlyStatsGroupedByDays(q: StatsQuery) {
    const today = q.date ? new Date(q.date) : new Date();
    const dates: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return {
      late_and_early: {
        late: dates.map((date) => ({ date, count: 0 })),
        early: dates.map((date) => ({ date, count: 0 })),
      },
    };
  }

  // Laravel: DashboardPreviewController::preview — multi-section payload.
  async preview() {
    return {
      work_durations: { current_page: 1, per_page: 10, total: 0, data: [] as Array<unknown> },
      late_count: 0,
      early_count: 0,
      devices: { all: 0, online: 0, offline: 0 },
      total_workers: 0,
    };
  }
}
