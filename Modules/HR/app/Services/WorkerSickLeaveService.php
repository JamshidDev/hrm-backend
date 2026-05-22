<?php

namespace Modules\HR\Services;

use Illuminate\Support\Facades\DB;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPosition;
use Modules\HR\Models\WorkerSickLeave;

class WorkerSickLeaveService
{
    public function store($data): void
    {
        $worker = Worker::whereUuid($data['uuid'])->first();
        if (!$worker) {
            throw HRServiceException::workerNotFound(trans('messages.worker.not_found'));
        }

        $workerPosition = WorkerPosition::where('id', $data['worker_position_id'])
            ->where('worker_id', $worker->id)
            ->first();
        if (!$workerPosition) {
            throw HRServiceException::workerNotFound(trans('messages.worker.not_found'));
        }

        DB::transaction(function () use ($data, $worker) {
            $data['worker_id'] = $worker->id;
            unset($data['uuid']);

            WorkerSickLeave::create($data);
        });
    }

    public function update(WorkerSickLeave $workerSickLeave, $data): void
    {
        $workerPosition = WorkerPosition::where('id', $data['worker_position_id'])
            ->where('worker_id', $workerSickLeave->worker_id)
            ->first();
        if (!$workerPosition) {
            throw HRServiceException::workerNotFound(trans('messages.worker.not_found'));
        }

        DB::transaction(function () use ($workerSickLeave, $data) {
            $workerSickLeave->update($data);
        });
    }

    public function delete(WorkerSickLeave $workerSickLeave): void
    {
        $workerSickLeave->delete();
    }
}
