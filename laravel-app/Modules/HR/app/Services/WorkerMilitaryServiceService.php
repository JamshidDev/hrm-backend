<?php

namespace Modules\HR\Services;

use Modules\HR\DTO\WorkerMilitaryDTO;
use Modules\HR\Models\WorkerMilitaryService;

class WorkerMilitaryServiceService
{
    public function store(WorkerMilitaryDTO $dto): void
    {
        WorkerMilitaryService::create([
            'worker_id'     => $dto->workerId,
            'status'        => $dto->status,
            'name'          => $dto->status ? $dto->name : null,
            'number'        => $dto->status ? $dto->number : null,
            'speciality'    => $dto->status ? $dto->speciality : null,
            'commissariat'  => $dto->status ? $dto->commissariat : null,
        ]);
    }

    public function update(
        WorkerMilitaryService $model,
        WorkerMilitaryDTO     $dto
    ): void {
        $model->update([
            'status'        => $dto->status,
            'name'          => $dto->status ? $dto->name : null,
            'number'        => $dto->status ? $dto->number : null,
            'speciality'    => $dto->status ? $dto->speciality : null,
            'commissariat'  => $dto->status ? $dto->commissariat : null,
        ]);
    }

    public function delete(WorkerMilitaryService $model): void
    {
        $model->delete();
    }
}
