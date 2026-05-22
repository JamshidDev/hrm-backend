<?php

namespace App\Services;

use App\Models\User;
use App\Exceptions\WorkerPositionServiceException;
use Illuminate\Database\Eloquent\Collection;
use Modules\HR\Enums\ContractTypeEnum;
use Modules\HR\Enums\PositionStatusEnum;
use Modules\HR\Models\Contract;
use Modules\HR\Models\DepartmentPosition;
use Modules\HR\Models\WorkerPosition;
use Spatie\Permission\Models\Role;

class WorkerPositionService
{
    public function __construct(protected ChangePushRabbitService $changePush)
    {
    }

    public function updateWorker($data): void
    {
        $workerPosition = WorkerPosition::with('schedule')->find($data['worker_position_id']);
        if (!$workerPosition) {
            throw WorkerPositionServiceException::workerPositionNotFound(trans('messages.worker_position_not_found'));
        }

        if (!array_key_exists('group', $data) || !$data['group']) {
            $data['group'] = 0;
        }
        if (!array_key_exists('rank', $data) || !$data['rank']) {
            $data['rank'] = '4';
        }

        $workerPosition->update([
            'group'  => $data['group'],
            'rank'   => $data['rank'],
            'rate' => $data['rate'],
            'salary' => $data['salary']
        ]);
    }

    public function updateWorkerPosition($data): void
    {
        $workerPosition = WorkerPosition::find($data['worker_position_id']);
        if (!$workerPosition) {
            throw WorkerPositionServiceException::workerPositionNotFound(trans('messages.worker_position_not_found'));
        }
        $workerPosition->update([
            'status' => PositionStatusEnum::FINISHED->value,
            'to' => $data['position_date'] ?? now()
        ]);
        $data['type'] = $workerPosition->type;
        $this->changePush->workerPositionUpdate($workerPosition);
        $this->createWorker($data);
    }

    public function createWorker($data): void
    {
        $departmentPosition = DepartmentPosition::find($data['department_position_id']);
        if (!$departmentPosition) {
            throw WorkerPositionServiceException::departmentPositionNotFound(trans('messages.department_position_not_found'));
        }
        $data['department_id'] = $departmentPosition->department_id;
        $data['position_id'] = $departmentPosition->position_id;
        $data['organization_id'] = $departmentPosition->organization_id;

        $data['contract_position'] = true;
        $data['probation'] = $data->probation ?? 0;

        if ($data['type'] === 21) {
            $data['type'] = 1;
        }

        if (array_key_exists('additional_vacation_day', $data) && $data['additional_vacation_day'] === null) {
            $data['additional_vacation_day'] = 0;
        }
        if (!array_key_exists('position_date', $data) || !$data['position_date']) {
            $data['position_date'] = $data['command_date'];
        }
        if (!array_key_exists('vacation_main_day', $data) || !$data['vacation_main_day']) {
            $data['vacation_main_day'] = 0;
        }
        $data['status'] = PositionStatusEnum::ACTIVE->value;

        $workerPosition = WorkerPosition::query()
            ->where('worker_id', $data['worker_id'])
            ->where('type', ContractTypeEnum::ONE->value)
            ->whereStatus(PositionStatusEnum::ACTIVE->value)
            ->exists();

        if ($workerPosition && $data['type'] === ContractTypeEnum::ONE->value) {
            \Log::info('workerAlready', $data);
            throw WorkerPositionServiceException::workerAlreadyHasActivePosition(trans('messages.worker.already'));
        }

        if (!array_key_exists('group', $data) || !$data['group']) {
            $data['group'] = 0;
        }
        if (!array_key_exists('rank', $data) || !$data['rank']) {
            $data['rank'] = '4';
        }

        $workerPosition = WorkerPosition::updateOrCreate(
            [
                'organization_id' => $data['organization_id'],
                'worker_id' => $data['worker_id'],
                'department_position_id' => $data['department_position_id'],
            ],
            $data
        );

        $this->changePush->workerPositionUpdate($workerPosition);
        $contract = Contract::query()->find($data['contract_id']);
        $contract?->update([
            'status' => PositionStatusEnum::ACTIVE->value
        ]);

        $user = User::query()->where('worker_id', $workerPosition->worker_id)->first();
        $user?->update(['organization_id' => $workerPosition->organization_id]);
        $role = Role::findByName('Worker');
        if ($user) {
            if ($user->hasRole('Worker')) {
                $user->roles()->detach($role->id);
            }
            $user->roles()->attach($role->id, [
                'organization_id' => $workerPosition->organization_id,
                'model_type'      => User::class,
            ]);
        }
    }

    public function finishedWorkerPosition($data): void
    {
        $workerPosition = WorkerPosition::find($data['worker_position_id']);
        $workerPosition?->update([
            'status' => PositionStatusEnum::FINISHED->value,
            'to' => $data['contract_to_date'] ?? now()
        ]);
        $this->changePush->workerPositionUpdate($workerPosition);
    }

    public function checkWorker($pin): Collection
    {
        return WorkerPosition::query()
            ->whereHas('worker', function ($query) use ($pin) {
                $query->where('pin', $pin);
            })
            ->where('status', PositionStatusEnum::ACTIVE->value)
            ->get();
    }
}
