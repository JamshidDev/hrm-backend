<?php

namespace Modules\Turnstile\Services;

use App\Helpers\Helper;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\WorkerPosition;
use Modules\Turnstile\Exceptions\TurnstileServiceException;
use Modules\Turnstile\Models\TurnstileScheduleGroup;
use Modules\Turnstile\Models\TurnstileWorkerSchedule;

class TurnstileScheduleGroupService
{
    public function index($filters, $user)
    {
        return TurnstileScheduleGroup::query()
            ->when(request('schedule_type'), function ($q) {
                $q->where('turnstile_schedule_type_id', request('schedule_type'));
            })
            ->filter($user, request()->all())
            ->with(['schedule_type'])
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);
    }
    public function groupWorkers($request)
    {
        $groupId = $request['group'] ?? null;
        $year = $request['year'] ?? now()->year;
        $month = $request['month'] ?? now()->month;

        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate?->copy()->endOfMonth();

        $allDates = [];
        for ($date = $startDate?->copy(); $date->lte($endDate); $date->addDay()) {
            $allDates[] = $date->format('Y-m-d');
        }
        $startDate = $startDate?->format('Y-m-d');
        $endDate = $endDate?->endOfMonth()->format('Y-m-d');

        $workers = DB::table('turnstile_worker_schedules as s')
            ->join('workers as w', 'w.id', '=', 's.worker_id')
            ->leftJoin('worker_positions as wp', 'wp.id', '=', 's.worker_position_id')
            ->leftJoin('organizations as o', 'o.id', '=', 'wp.organization_id')
            ->leftJoin('departments as d', 'd.id', '=', 'wp.department_id')
            ->leftJoin('positions as p', 'p.id', '=', 'wp.position_id')
            ->select(
                's.worker_id',
                // Worker FIO
                'w.first_name',
                'w.last_name',
                'w.middle_name',
                'w.photo',
                // Position
                'wp.id as worker_position_id',
                'p.name as position_name',
                // Department & Organization
                'd.name as department_name',
                'o.name as organization_name'
            )
            ->where('s.turnstile_schedule_group_id', $groupId)
            ->where('wp.status', PositionStatusEnum::ACTIVE->value)
            ->whereBetween('s.date', [$startDate, $endDate])
            ->groupBy(
                's.worker_id',
                'w.first_name',
                'w.last_name',
                'w.middle_name',
                'w.photo',
                'wp.id',
                'p.name',
                'd.name',
                'o.name'
            )
            ->paginate(request('per_page', 30));

        $days = TurnstileWorkerSchedule::query()
            ->selectRaw("
                turnstile_worker_schedules.id,
                turnstile_worker_schedules.worker_id,
                turnstile_worker_schedules.date,
                turnstile_worker_schedules.work_status,
                to_char(turnstile_worker_schedules.start_time, 'HH24:MI') as start_time,
                to_char(turnstile_worker_schedules.end_time, 'HH24:MI') as end_time,
                turnstile_worker_schedules.daily_minutes,
                turnstile_worker_schedules.fact_daily_minutes
            ")
            ->whereIn('worker_id', $workers->pluck('worker_id'))
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('worker_id')
            ->orderBy('date')
            ->get()
            ->groupBy('worker_id');

        $workers->getCollection()->transform(function ($w) use ($days, $allDates) {
            $workerDays = $days[$w->worker_id] ?? collect();

            $fullDays = collect($allDates)->map(function ($d) use ($workerDays) {
                $dayRecord = $workerDays->firstWhere('date', $d);
                return $dayRecord ?? (object)[
                    'id' => null,
                    'worker_id' => null,
                    'date' => $d,
                    'work_status' => false,
                    'start_time' => null,
                    'end_time' => null,
                    'daily_minutes' => 0,
                    'fact_daily_minutes' => 0,
                ];
            });

            $w->days = $fullDays;
            return $w;
        });

        return $workers;
    }

    public function destroy(int $groupId): void
    {
        WorkerPosition::query()
            ->where('turnstile_schedule_group_id', $groupId)
            ->update(['turnstile_schedule_group_id' => null, 'turnstile_schedule_type_id' => null]);
        TurnstileWorkerSchedule::query()
            ->where('turnstile_schedule_group_id', $groupId)
            ->forceDelete();
        TurnstileScheduleGroup::find($groupId)?->delete();
    }

    public function update($groupId, array $data): void
    {
        DB::beginTransaction();
        try {
            $group = TurnstileScheduleGroup::query()->findOrFail($groupId);
            if (!$group || $data['end_date'] > $group->end_date) {
                throw TurnstileServiceException::invalidEndDate(trans('messages.turnstile.end_date_must_be_greater'));
            }

            $groupWorkers = TurnstileWorkerSchedule::query()
                ->where('turnstile_schedule_group_id', $groupId)
                ->where('date', '>=', $data['end_date'])
                ->whereNotNull('fact_daily_minutes')
                ->count();
            if ($groupWorkers) {
                throw TurnstileServiceException::groupHasWorkers(trans('messages.turnstile.group_has_workers'));
            }
            $formData['end_date'] = $data['end_date'];
            TurnstileWorkerSchedule::query()
                ->where('turnstile_schedule_group_id', $groupId)
                ->where('date', '>=', $data['end_date'])
                ->forceDelete();
            $group->update($formData);
            DB::commit();
        } catch (TurnstileServiceException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            Helper::setLog($e, 'TurnstileWorkerScheduleController@updateGroup');
            throw TurnstileServiceException::serverError(trans('messages.server_error'));
        }
    }

}
