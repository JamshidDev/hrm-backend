<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerAcademicTitleDTO;
use Modules\HR\Models\WorkerAcademicTitle;

class WorkerAcademicTitleService
{
    use Base64FileUploadTrait;

    public function store(WorkerAcademicTitleDTO $dto): void
    {
        DB::transaction(function () use ($dto) {

            $data = [
                'worker_id' => $dto->workerId,
                'type' => $dto->type
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'academic-titles',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            WorkerAcademicTitle::create($data);
        });
    }

    public function update(WorkerAcademicTitle $workerAcademicTitle, WorkerAcademicTitleDTO $dto): void
    {
        DB::transaction(function () use ($workerAcademicTitle, $dto) {
            $data = [
                'type' => $dto->type
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'academic-titles',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            $workerAcademicTitle->update($data);
        });
    }

    public function delete(WorkerAcademicTitle $workerAcademicTitle): void
    {
        $workerAcademicTitle->delete();
    }
}
