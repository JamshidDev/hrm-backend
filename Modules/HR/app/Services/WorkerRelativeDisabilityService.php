<?php

namespace Modules\HR\Services;

use Illuminate\Support\Facades\DB;
use Modules\HR\Models\WorkerRelativeDisability;

class WorkerRelativeDisabilityService
{
    public function store($data): void
    {
        DB::transaction(function () use ($data) {
            WorkerRelativeDisability::create($data);
        });
    }

    public function update(WorkerRelativeDisability $workerRelativeDisability, $data): void
    {
        DB::transaction(function () use ($workerRelativeDisability, $data) {
            $workerRelativeDisability->update($data);
        });
    }

    public function delete(WorkerRelativeDisability $workerRelativeDisability): void
    {
        $workerRelativeDisability->delete();
    }
}
