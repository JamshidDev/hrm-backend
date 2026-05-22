<?php

namespace Modules\HR\Services;

use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\ConfirmationWorkerDTO;
use Modules\HR\Models\ConfirmationWorker;

class ConfirmationWorkerService
{
    public function index($filters, $user)
    {
        return ConfirmationWorker::query()
            ->where('organization_id', $user->organization_id)
            ->search()
            ->with(['worker:id,first_name,last_name,middle_name,photo'])
            ->paginate($filters['per_page'] ?? 10);
    }

    public function store(ConfirmationWorkerDTO $dto): void
    {
        DB::transaction(function () use ($dto) {
            $data = [
                'organization_id' => $dto->organizationId,
                'worker_id' => $dto->workerId,
                'level' => $dto->level,
                'position' => $dto->position,
            ];
            ConfirmationWorker::updateOrCreate([
                'organization_id' => $data['organization_id'],
                'worker_id'       => $data['worker_id'],
            ],
                $data
            );
        });
    }

    public function update(ConfirmationWorker $confirmationWorker, ConfirmationWorkerDTO $dto): void
    {
        DB::transaction(function () use ($confirmationWorker, $dto) {
            $data = [
                'organization_id' => $dto->organizationId,
                'worker_id' => $dto->workerId,
                'level' => $dto->level,
                'position' => $dto->position,
            ];

            $confirmationWorker->update($data);
        });
    }

    public function delete(ConfirmationWorker $confirmationWorker): void
    {
        $confirmationWorker->delete();
    }
}
