<?php

namespace Modules\HR\Services;

use Modules\HR\DTO\WorkerRelativeDTO;
use Modules\HR\Models\WorkerRelative;

class WorkerRelativeService
{
    public function store(WorkerRelativeDTO $dto): void
    {
        WorkerRelative::create([
            'worker_id' => $dto->workerId,
            'relative_worker_id' => $dto->relativeWorkerId,
            'pin' => $dto->pin,
            'relative' => $dto->relative,
            'last_name' => $dto->lastName,
            'first_name' => $dto->firstName,
            'middle_name' => $dto->middleName,
            'birthday' => $dto->birthday,
            'birth_place' => $dto->birthPlace,
            'post_name' => $dto->postName,
            'address' => $dto->address,
            'sort' => $dto->sort,
            'marital_status' => $dto->marital_status,
        ]);
    }

    public function update(WorkerRelative $relative, WorkerRelativeDTO $dto): void
    {
        $relative->update([
            'relative_worker_id' => $dto->relativeWorkerId,
            'pin' => $dto->pin,
            'relative' => $dto->relative,
            'last_name' => $dto->lastName,
            'first_name' => $dto->firstName,
            'middle_name' => $dto->middleName,
            'birthday' => $dto->birthday,
            'birth_place' => $dto->birthPlace,
            'post_name' => $dto->postName,
            'address' => $dto->address,
            'sort' => $dto->sort,
            'marital_status' => $dto->marital_status
        ]);
    }

    public function delete(WorkerRelative $relative): void
    {
        $relative->delete();
    }

    public function sort(array $orders): void
    {
        foreach ($orders as $item) {
            WorkerRelative::where('id', $item['worker_relative_id'])
                ->update(['sort' => $item['position']]);
        }
    }
}
