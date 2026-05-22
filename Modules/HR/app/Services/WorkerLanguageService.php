<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerLanguageDTO;
use Modules\HR\Models\WorkerLanguage;

class WorkerLanguageService
{
    use Base64FileUploadTrait;

    public function store(WorkerLanguageDTO $dto): void
    {
        DB::transaction(function () use ($dto) {

            $data = [
                'worker_id'     => $dto->workerId,
                'language_id' => $dto->languageId
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'worker-languages',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            WorkerLanguage::create($data);
        });
    }

    public function update(WorkerLanguage $workerLanguage, WorkerLanguageDTO $dto): void
    {
        DB::transaction(function () use ($workerLanguage, $dto) {
            $data = [
                'language_id' => $dto->languageId
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'worker-languages',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            $workerLanguage->update($data);
        });
    }

    public function delete(WorkerLanguage $workerLanguage): void
    {
        $workerLanguage->delete();
    }
}
