<?php

namespace Modules\HR\Services;

use App\Services\ChangePushRabbitService;
use Illuminate\Support\Facades\DB;
use Modules\Economist\Enums\ChangedStatusEnum;
use Modules\Economist\Enums\ConfirmStatusEnum;
use Modules\HR\DTO\DepartmentPositionDTO;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;

class DepartmentPositionService
{
    public function __construct(
        public ChangePushRabbitService $changePush
    )
    {
    }

    public function index($filters, $user)
    {
        $perPage = $filters['per_page'] ?? 10;

        $query = DepartmentPosition::query()
            ->from('department_positions as dp')
            ->withoutGlobalScopes()
            ->whereNull('dp.deleted_at')
            ->joinSearch()
            ->filterByOrganizationsWithJoin($user)
            ->leftJoin('organizations as o', 'o.id', '=', 'dp.organization_id')
            ->leftJoin('positions as p', 'p.id', '=', 'dp.position_id')
            ->leftJoin('departments as d', 'd.id', '=', 'dp.department_id')
            ->leftJoin('worker_positions as wp', function ($join) {
                $join->on('wp.department_position_id', '=', 'dp.id')
                    ->where('wp.status', PositionStatusEnum::ACTIVE->value)
                    ->whereNull('wp.deleted_at');
            })
            ->select([
                'dp.id',
                'dp.organization_id',
                'dp.department_id',
                'dp.position_id',
                'dp.rate',
                'dp.group',
                'dp.rank',
                'dp.max_rank',
                'dp.salary',
                'dp.experience',
                'dp.education',
                'dp.status',
                'dp.changed_status',

                // organization
                'o.name as organization_name',
                'o.name_en as organization_name_en',
                'o.name_ru as organization_name_ru',
                'o.group as organization_group',

                // department
                'd.name as department_name',
                'd.level as department_level',

                // position
                'p.name as position_name',
                'p.name_en as position_name_en',
                'p.name_ru as position_name_ru',

                // SUM
                DB::raw('COALESCE(SUM(wp.rate), 0) as worker_rate'),
            ])
            ->groupBy([
                'dp.id',
                'o.id',
                'd.id',
                'p.id'
            ])
            ->orderBy('o.id')
            ->orderBy('d.id')
            ->orderByDesc('dp.id');

        return $query->paginate($perPage);
    }

    public function store(DepartmentPositionDTO $dto): void
    {
        DepartmentPosition::create([
            'department_id' => $dto->departmentId,
            'position_id' => $dto->positionId,
            'rate' => $dto->rate,
            'rank' => $dto->rank,
            'group' => $dto->group,
            'salary' => $dto->salary,
            'experience' => $dto->experience,
            'education' => $dto->education,
            'max_rank' => $dto->maxRank,
            'organization_id' => $dto->organizationId,
        ]);
    }

    public function update(DepartmentPosition $departmentPosition, array $data): void
    {
        DB::transaction(function () use ($departmentPosition, $data) {

            $this->syncWorkerPositions($departmentPosition, $data);

            if (
                $departmentPosition->position_id !== (int)$data['position_id']
                || (float)$departmentPosition->rate !== (float)$data['rate']
            ) {
                $data['changed_status'] = ChangedStatusEnum::UPDATED->value;
                $data['status'] = ConfirmStatusEnum::NEW->value;
            }

            $departmentPosition->update($data);
        });
    }

    public function delete(DepartmentPosition $departmentPosition): void
    {
        $hasActiveWorkers = WorkerPosition::query()
            ->where('department_position_id', $departmentPosition->id)
            ->where('status', PositionStatusEnum::ACTIVE->value)
            ->exists();

        if ($hasActiveWorkers) {
            throw HRServiceException::departmentPositionHasWorkers(trans('messages.department_position_has_workers'));
        }

        $departmentPosition->update([
            'status' => ConfirmStatusEnum::NEW->value,
            'changed_status' => ChangedStatusEnum::DELETED->value,
        ]);

        $departmentPosition->delete();
    }

    private function syncWorkerPositions(
        DepartmentPosition $departmentPosition,
        array              $data
    ): void
    {
        $wps = WorkerPosition::where(
            'department_position_id',
            $departmentPosition->id
        )->get();

        foreach ($wps as $wp) {
            $changed = false;

            if ($departmentPosition->position_id !== (int)$data['position_id']) {
                $wp->position_id = (int)$data['position_id'];
                $changed = true;
            }

            if ($departmentPosition->department_id !== (int)$data['department_id']) {
                $wp->department_id = (int)$data['department_id'];
                $changed = true;
            }

            if ($changed) {
                $wp->save();
                $this->changePush->workerPositionUpdate($wp);
            }
        }
    }
}
