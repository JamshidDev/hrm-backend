<?php

namespace Modules\HR\Http\Controllers\Dashboard;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Enums\VacationTypeEnum;
use Modules\HR\Models\Contract;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\OrganizationDisciplinary;
use Modules\HR\Models\OrganizationIncentive;
use Modules\HR\Models\Vacation;
use Modules\HR\Models\WorkerDisability;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Models\WorkerRelativeDisability;
use Modules\HR\Models\WorkerSickLeave;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user();
        $currentDate = now();
        $dbDriver = DB::connection()->getDriverName();

        $departmentPositions = DepartmentPosition::query()->filter($user, request()->all())->sum('rate');

        $workerPositions = WorkerPosition::query()->filter($user, request()->all())->sum('rate');

        $birthdays = DashboardService::birthdays($user);
        $data = DashboardService::workersFilter($user, $currentDate);

        $data = [
            'workers_count'         => (int)$data?->workers_count,
            'woman_count'           => (int)$data?->woman_count,
            'mans_count'            => (int)$data?->mans_count,
            'passports_count'       => (int)$data?->passports_count,
            'passports_more_count'  => (int)$data?->passports_more_count,
            'retired_men_count'     => (int)$data?->retired_men_count,
            'retired_women_count'   => (int)$data?->retired_women_count,
            'age_30_and_younger'    => (int)$data?->age_30_and_younger,
            'age_31_to_45'          => (int)$data?->age_31_to_45,
            'age_46_and_older'      => (int)$data?->age_46_and_older,
            'higher_edu_count'      => (int)$data?->higher_edu_count,
            'middle_edu_count'      => (int)$data?->special_edu_count,
            'special_edu_count'     => (int)$data?->middle_edu_count,
            'contracts'             => $this->contracts($dbDriver, $user),
            'contract_types'        => $this->typeContracts($user),
            'vacation_types'        => $this->typeVacations($user),
            'positions_rate'        => (double)$departmentPositions / 100,
            'worker_positions_rate' => (double)$workerPositions / 100,
            'birthdays'             => $birthdays,
        ];
        return Helper::response(true, $data);
    }

    public function indexTwo(): JsonResponse
    {
        $user = auth()->user();
        $currentDate = now();
        $nextMonth = now()->copy()->addMonth();

        $workersIds = WorkerPosition::filter($user, request()->all())->select('worker_id');
        $stats = DB::query()
            ->selectRaw("
                SUM(CASE WHEN latest_to <= ? THEN 1 ELSE 0 END) AS meds_finished,
                SUM(CASE WHEN latest_to > ? AND latest_to < ? THEN 1 ELSE 0 END) AS meds_approaching
            ", [$currentDate->format('Y-m-d'),
                $currentDate->format('Y-m-d'),
                $nextMonth->format('Y-m-d')])
            ->fromSub(function ($query) use ($workersIds) {
                $query->from('meds')
                    ->selectRaw('worker_id, MAX("to") as latest_to')
                    ->whereIn('worker_id', $workersIds)
                    ->groupBy('worker_id');
            }, 'latest_meds')
            ->first();

        $disciplinaryActions = OrganizationDisciplinary::query()
            ->filter($user, request()->all())
            ->whereYear('date', $currentDate->year)
            ->selectRaw('
                COUNT(*) as total_count,
                SUM(CASE WHEN fine_type = 1 THEN 1 ELSE 0 END) as fine_type_1_count
            ')
            ->first();

        $incentives = OrganizationIncentive::query()
            ->filter($user, request()->all())
            ->whereYear('date', $currentDate->year)
            ->selectRaw('
                COUNT(*) as total_count,
                SUM(CASE WHEN gift_type = 4 THEN 1 ELSE 0 END) as gift_type_1_count
            ')
            ->first();

        $data = [
            'meds_finished' => $stats->meds_finished ?? 0,
            'meds_approaching' => $stats->meds_approaching ?? 0,
            'disciplinary_actions' => ($disciplinaryActions->total_count ?? 0) - ($disciplinaryActions->fine_type_1_count ?? 0),
            'disciplinary_actions_fine_type' => $disciplinaryActions?->fine_type_1_count,
            'incentives' => ($incentives->total_count ?? 0) - ($incentives->gift_type_1_count ?? 0),
            'incentive_actions_gift_type' => $incentives?->gift_type_1_count,
        ];

        return Helper::response(true, $data);
    }

    public function indexThree(): JsonResponse
    {
        $data = [
            'worker_disabilities' => $this->workerDisabilityStats(),
            'worker_relative_disabilities' => $this->workerRelativeDisabilityStats(),
            'worker_sick_leaves' => $this->workerSickLeaveStats(),
        ];

        return Helper::response(true, $data);
    }

    public function contracts($dbDriver, $user): Collection
    {
        $from = now()->copy()->subMonths(8)->startOfMonth();
        $to = now()->copy()->endOfMonth();
        $monthFormat = $dbDriver === 'pgsql'
            ? "TO_CHAR(%s, 'YYYY-MM')"
            : "DATE_FORMAT(%s, '%Y-%m')";

        $newContracts = Contract::query()
            ->filter($user, request()->all())
            ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->whereNotNull('worker_id')
            ->whereHas('contract_position')
            ->whereBetween('contract_date', [$from, $to])
            ->selectRaw(sprintf($monthFormat, 'contract_date') . ' AS month')
            ->selectRaw('COUNT(DISTINCT worker_id) AS new_contracts')
            ->groupByRaw(sprintf($monthFormat, 'contract_date'))
            ->pluck('new_contracts', 'month');

        $endedContracts = Contract::query()
            ->filter($user, request()->all())
            ->where('confirmation', ConfirmationStatusEnum::SUCCESS->value)
            ->where('status', PositionStatusEnum::FINISHED->value)
            ->whereNotNull('worker_id')
            ->whereHas('contract_position')
            ->whereBetween('contract_to_date', [$from, $to])
            ->selectRaw(sprintf($monthFormat, 'contract_to_date') . ' AS month')
            ->selectRaw('COUNT(DISTINCT worker_id) AS ended_contracts')
            ->groupByRaw(sprintf($monthFormat, 'contract_to_date'))
            ->pluck('ended_contracts', 'month');

        return collect(CarbonPeriod::create($from, '1 month', $to))
            ->map(function ($date) use ($newContracts, $endedContracts) {
                $month = $date->format('Y-m');

                return [
                    'month' => $month,
                    'new_contracts' => (int) ($newContracts[$month] ?? 0),
                    'ended_contracts' => (int) ($endedContracts[$month] ?? 0),
                ];
            })
            ->values();
    }

    public function typeContracts($user): Collection
    {
        $contractCounts = Contract::query()
            ->filter($user, request()->all())
            ->select('type', DB::raw('COUNT(*) as active_contracts'))
            ->where('status', PositionStatusEnum::ACTIVE->value)
            ->groupBy('type')
            ->pluck('active_contracts', 'type');

        $allTypes = ContractTypeEnum::cases();

        return collect($allTypes)->map(fn($type) => [
            'id'               => $type->value,
            'type'             => ContractTypeEnum::getMinimized($type->value),
            'active_contracts' => $contractCounts[$type->value] ?? 0,
        ])->values();
    }

    public function typeVacations($user): array
    {
        $vacationCounts = Vacation::query()
            ->whereHas('worker', function ($q) use ($user) {
                $q->whereHas('positions', function ($q) use ($user) {
                    $q->filter($user, request()->all());
                });
            })
            ->select('type', DB::raw('COUNT(*) as active_vacations'))
            ->whereDate('to', '>=', now())
            ->groupBy('type')
            ->pluck('active_vacations', 'type');

        $v = [];
        foreach ($vacationCounts as $key => $vacationCount) {
            $name = VacationTypeEnum::get($key, null);
            $v[$name] = [
                'id'               => $key,
                'name'             => VacationTypeEnum::get($key, null),
                'active_vacations' => ($v[$name]['active_vacations'] ?? 0) + $vacationCount ?? 0
            ];
        }
        return collect($v)->values()->toArray();
    }

    private function workerDisabilityStats(): array
    {
        $user = auth()->user();

        $workerIds = WorkerPosition::query()
            ->filter($user, request()->all())
            ->select('worker_id');

        $levels = WorkerDisability::query()
            ->whereIn('worker_id', $workerIds)
            ->select('level', DB::raw('COUNT(*) as count'))
            ->groupBy('level')
            ->pluck('count', 'level');

        return [
            'total_count' => (int)$levels->sum(),
            'levels' => $levels->map(fn($count, $level) => [
                'level' => (int)$level,
                'count' => (int)$count,
            ])->values(),
        ];
    }

    private function workerRelativeDisabilityStats(): array
    {
        $user = auth()->user();

        $levels = WorkerRelativeDisability::query()
            ->whereHas('workerRelative.worker.positions', function ($query) use ($user) {
                $query->filter($user, request()->all());
            })
            ->select('level', DB::raw('COUNT(*) as count'))
            ->groupBy('level')
            ->pluck('count', 'level');

        return [
            'total_count' => (int)$levels->sum(),
            'levels' => $levels->map(fn($count, $level) => [
                'level' => (int)$level,
                'count' => (int)$count,
            ])->values(),
        ];
    }

    private function workerSickLeaveStats(): array
    {
        $user = auth()->user();
        $currentDate = now()->format('Y-m-d');

        $query = WorkerSickLeave::query()
            ->whereHas('workerPosition', function ($query) use ($user) {
                $query->filter($user, request()->all());
            });

        $stats = (clone $query)
            ->selectRaw('
                COUNT(*) as total_count,
                SUM(CASE WHEN from_date <= ? AND (to_date IS NULL OR to_date >= ?) THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN to_date < ? THEN 1 ELSE 0 END) as finished_count
            ', [$currentDate, $currentDate, $currentDate])
            ->first();

        $types = (clone $query)
            ->select('type', DB::raw('COUNT(*) as count'))
            ->groupBy('type')
            ->pluck('count', 'type');

        return [
            'total_count' => (int)($stats?->total_count ?? 0),
            'active_count' => (int)($stats?->active_count ?? 0),
            'finished_count' => (int)($stats?->finished_count ?? 0),
            'types' => $types->map(fn($count, $type) => [
                'type' => (int)$type,
                'count' => (int)$count,
            ])->values(),
        ];
    }
}
