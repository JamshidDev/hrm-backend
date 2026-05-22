<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerUniversityDTO;
use Modules\HR\Models\WorkerUniversity;

class WorkerUniversityService
{
    use Base64FileUploadTrait;

    public function store(WorkerUniversityDTO $dto): void
    {
        DB::transaction(function () use ($dto) {

            $data = [
                'worker_id'     => $dto->workerId,
                'university_id' => $dto->universityId,
                'speciality_id' => $dto->specialityId,
                'from_date'     => $dto->fromDate,
                'to_date'       => $dto->toDate,
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'worker-universities',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            WorkerUniversity::create($data);
        });
    }

    public function update(WorkerUniversity $workerUniversity, WorkerUniversityDTO $dto): void
    {
        DB::transaction(function () use ($workerUniversity, $dto) {
            $data = [
                'university_id' => $dto->universityId,
                'speciality_id' => $dto->specialityId,
                'from_date'     => $dto->fromDate,
                'to_date'       => $dto->toDate,
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'worker-universities',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            $workerUniversity->update($data);
        });
    }

    public function delete(WorkerUniversity $workerUniversity): void
    {
        $workerUniversity->delete();
    }
}
