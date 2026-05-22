<?php

namespace Modules\HR\Services;

use App\Enums\ExportTaskEnum;
use App\Jobs\HR\VacationWorkersExportJob;
use App\Models\UserExportTask;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\WorkerPosition;

class VacationService
{
    public function list(array $filters, $user)
    {
        if (!empty($filters['download'])) {
            $task = UserExportTask::create([
                'user_id' => $user->id,
                'type' => ExportTaskEnum::VACATION_WORKERS->value,
            ]);

            VacationWorkersExportJob::dispatch($filters, $task, $user->id);
            return null;
        }

        $query = Vacation::query()
            ->whereHas('worker', function ($query) use ($user, $filters) {
                $query->whereHas('position', function ($query) use ($user, $filters) {
                    $query->filter($user, $filters);
                });
            })
            ->when($filters['search'] ?? null,
                fn($q) => $q->whereHas('worker',
                    fn($w) => $w->searchByFullName()))
            ->when($filters['worker_position_id'] ?? null, function ($q, $id) {
                $q->where('worker_id',
                    WorkerPosition::where('id', $id)
                        ->whereStatus(PositionStatusEnum::ACTIVE->value)
                        ->select('worker_id'));
            })
            ->with([
                'command:id,command_number,command_date,type',
                'worker_position.worker:id,first_name,last_name,middle_name,uuid,photo',
                'worker_position.department:id,name,level',
                'worker_position.position:id,name',
                'worker_position.organization:id,name,name_en,name_ru,group,full_name',
            ]);

        $type = (int)($filters['vacation_type'] ?? 0);

        if ($type && $type !== 8) {
            $query->whereIn('type', VacationTypeEnum::getVacationKey($type));
        }

        if ($type === 8) {
            $query->whereNotIn('type', VacationTypeEnum::getVacationKey($type));
        }

        return $query
            ->whereDate('to', '>=', now())
            ->orderByDesc('to')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function getLastVacations(array $workerPositionIds): array
    {
        $workerIds = WorkerPosition::whereIn('id', $workerPositionIds)
            ->pluck('worker_id')
            ->unique();

        return Vacation::whereIn('worker_id', $workerIds)
            ->latest('id')
            ->get()
            ->groupBy('worker_position_id')
            ->map(function ($v) {
                $lastVacation = $v->first();
                return [
                    'all_day' => $lastVacation->all_day,
                    'type' => [
                        'id' => $lastVacation->type,
                        'name' => VacationTypeEnum::get($lastVacation->type, null),
                    ],
                    'worker_position_id' => $lastVacation->worker_position_id,
                    'period_from' => $lastVacation->period_from,
                    'period_to' => $lastVacation->period_to,
                    'from' => $lastVacation->from,
                    'to' => $lastVacation->to,
                    'rest_day' => $lastVacation->rest_day,
                ];
            })
            ->values()
            ->toArray();
    }

    public function getMyLatestVacation($workerPositionId, $user): array
    {
        $workerId = WorkerPosition::query()
            ->where('worker_id', $user->worker_id)
            ->findOrFail($workerPositionId)?->worker_id;

        $lastVacation = Vacation::where('worker_id', $workerId)
            ->latest('id')
            ->first();
        if (!$lastVacation) {
            return [];
        }
        return [
            'all_day' => $lastVacation->all_day,
            'type' => [
                'id' => $lastVacation->type,
                'name' => VacationTypeEnum::get($lastVacation->type, null),
            ],
            'period_from' => $lastVacation->period_from,
            'period_to' => $lastVacation->period_to,
            'from' => $lastVacation->from,
            'to' => $lastVacation->to,
            'rest_day' => $lastVacation->rest_day,
        ];
    }

    public function calculate(Collection $input): array
    {
        $positions = WorkerPosition::whereIn('id', $input->pluck('id'))
            ->with(['vacations', 'worker', 'contract'])
            ->get()
            ->keyBy('id');

        $result = [];

        foreach ($input as $row) {
            $wp = $positions[$row['id']];
            $lastVacation = $wp->vacations->sortByDesc('to')->first();

            $restDay = $lastVacation?->rest_day ?? 0;
            $periodFrom = $lastVacation?->period_to ?? $wp->contract?->contract_date ?? now()->format('Y-m-d');
            $periodTo = Carbon::parse($periodFrom)->addYear();

            $experience = Carbon::parse($wp->worker->experience_date)->diffInYears();

            $otherDay = collect($row['additional'] ?? [])
                ->sum('value');

            $allDay = $row['main_day'] + $row['second_day'] + $otherDay + $restDay;

            $from = Carbon::parse($row['from']);
            $to = $from->copy()->addDays($allDay);

            $workDay = match ($to->dayOfWeek) {
                CarbonInterface::SATURDAY => $to->copy()->addDays(2),
                CarbonInterface::SUNDAY => $to->copy()->addDay(),
                default => $to,
            };

            $result[] = [
                'id' => $wp->id,
                'period_from' => $periodFrom,
                'period_to' => $periodTo->format('Y-m-d'),
                'to' => $to->format('Y-m-d'),
                'work_day' => $workDay->format('Y-m-d'),
                'all_day' => $allDay,
                'second_day' => $row['second_day'],
                'experience' => $experience,
            ];
        }

        return $result;
    }
}
