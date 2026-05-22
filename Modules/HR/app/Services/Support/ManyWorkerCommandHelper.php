<?php

namespace Modules\HR\Services\Support;

use App\Helpers\PositionHelper;
use Modules\HR\Models\Department;
use Modules\HR\Models\WorkerPosition;
use Modules\Structure\Models\Organization;

class ManyWorkerCommandHelper
{
    public function prepare(array $data, bool $withDestinationLookups = false): array
    {
        $requestWorkerPositions = collect($data)->keyBy('id');
        $requestWorkerPositionIds = $requestWorkerPositions->pluck('id')->toArray();

        $workerPositions = WorkerPosition::with([
            'worker:id,last_name,first_name,middle_name',
            'organization:id,full_name',
            'department:id,name',
            'position:id,name',
            'contract:id,number,contract_date'
        ])->whereIn('id', $requestWorkerPositionIds)->get();

        $prepared = [
            'worker_positions' => $workerPositions,
            'request_worker_positions' => $requestWorkerPositions,
        ];

        if (!$withDestinationLookups) {
            return $prepared;
        }

        $prepared['destination_organizations'] = Organization::query()
            ->whereIn('id', $requestWorkerPositions->pluck('work_place_id')->filter()->unique()->values())
            ->pluck('full_name', 'id');

        $prepared['destination_departments'] = Department::query()
            ->whereIn('id', $requestWorkerPositions->pluck('department_id')->filter()->unique()->values())
            ->pluck('name', 'id');

        return $prepared;
    }

    public function appendCommandConfirmations(int $commandId, iterable $workerPositions, array &$confirmations): array
    {
        foreach ($workerPositions as $workerPosition) {
            $confirmations[] = [
                'command_id' => $commandId,
                'position' => PositionHelper::getShortPosition($workerPosition),
                'type' => 'w',
                'worker_id' => $workerPosition->worker_id,
                'order' => 1,
            ];
        }

        return $confirmations;
    }
}
