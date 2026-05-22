<?php

namespace Modules\HR\Services;

use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerPhoneDTO;
use Modules\HR\Models\WorkerPhone;

class WorkerPhoneService
{
    public function store(WorkerPhoneDTO $dto): void
    {
        DB::transaction(function () use ($dto) {
            $data = [
                'worker_id' => $dto->workerId,
                'phone' => $dto->phone,
            ];
            WorkerPhone::create($data);
        });
    }

    public function update(WorkerPhone $workerPhone, WorkerPhoneDTO $dto): void
    {
        DB::transaction(function () use ($workerPhone, $dto) {
            $data = [
                'worker_id' => $dto->worker_id,
                'phone' => $dto->phone
            ];
            $workerPhone->update($data);
        });
    }

    public function delete(WorkerPhone $workerPhone): void
    {
        $workerPhone->delete();
    }
}
