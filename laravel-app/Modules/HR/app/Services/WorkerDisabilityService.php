<?php

namespace Modules\HR\Services;

use Illuminate\Support\Facades\DB;
use Modules\HR\Exceptions\HRServiceException;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerDisability;

class WorkerDisabilityService
{
    public function store($data): void
    {
        $worker = Worker::whereUuid($data['uuid'])->first();
        if (!$worker) {
            throw HRServiceException::workerNotFound(trans('messages.worker.not_found'));
        }
        DB::transaction(function () use ($data, $worker) {
            $data['worker_id'] = $worker->id;
            WorkerDisability::create($data);
        });
    }

    public function update(WorkerDisability $workerDisability, $data): void
    {
        DB::transaction(function () use ($workerDisability, $data) {
            $workerDisability->update($data);
        });
    }

    public function delete(WorkerDisability $workerDisability): void
    {
        $workerDisability->delete();
    }
}
