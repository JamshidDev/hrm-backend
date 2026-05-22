<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerAcademicDegreeDTO;
use Modules\HR\Models\WorkerAcademicDegree;

class WorkerAcademicDegreeService
{
    use Base64FileUploadTrait;

    public function store(WorkerAcademicDegreeDTO $dto): void
    {
        DB::transaction(function () use ($dto) {

            $data = [
                'worker_id' => $dto->workerId,
                'type' => $dto->type
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'academic-degrees',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            WorkerAcademicDegree::create($data);
        });
    }

    public function update(WorkerAcademicDegree $workerAcademicDegree, WorkerAcademicDegreeDTO $dto): void
    {
        DB::transaction(function () use ($workerAcademicDegree, $dto) {
            $data = ['type' => $dto->type];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'academic-degrees',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            $workerAcademicDegree->update($data);
        });
    }

    public function delete(WorkerAcademicDegree $workerAcademicDegree): void
    {
        $workerAcademicDegree->delete();
    }
}
