<?php

namespace Modules\HR\Services;

use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerPartyDTO;
use Modules\HR\Models\WorkerParty;

class WorkerPartyService
{
    public function store(WorkerPartyDTO $dto): void
    {
        DB::transaction(function () use ($dto) {
            $data = [
                'worker_id' => $dto->workerId,
                'party' => $dto->party,
                'from_date' => $dto->fromDate,
            ];
            WorkerParty::create($data);
        });
    }

    public function update(WorkerParty $workerParty, WorkerPartyDTO $dto): void
    {
        DB::transaction(function () use ($workerParty, $dto) {
            $data = [
                'worker_id' => $dto->worker_id,
                'party' => $dto->party,
                'from_date' => $dto->fromDate
            ];
            $workerParty->update($data);
        });
    }

    public function delete(WorkerParty $workerParty): void
    {
        $workerParty->delete();
    }
}
