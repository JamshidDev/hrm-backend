<?php

namespace Modules\HR\Services;

use Modules\HR\DTO\WorkerOldCareerDTO;
use Modules\HR\Models\WorkerOldCareer;

class WorkerOldCareerService
{
    public function store(WorkerOldCareerDTO $dto): void
    {
        WorkerOldCareer::create([
            'worker_id' => $dto->workerId,
            'from_date' => $dto->fromDate,
            'to_date' => $dto->toDate,
            'post_name' => $dto->postName,
            'sort' => $dto->sort
        ]);
    }

    public function update(WorkerOldCareer $workerOldCareer, WorkerOldCareerDTO $dto): void
    {
        $workerOldCareer->update([
            'from_date' => $dto->fromDate,
            'to_date' => $dto->toDate,
            'post_name' => $dto->postName,
            'sort' => $dto->sort
        ]);
    }

    public function delete(WorkerOldCareer $workerOldCareer): void
    {
        $workerOldCareer->delete();
    }

    public function sort(array $orders): void
    {
        foreach ($orders as $item) {
            WorkerOldCareer::where('id', $item['worker_old_career_id'])
                ->update(['sort' => $item['position']]);
        }
    }
}
