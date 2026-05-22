<?php

namespace Modules\HR\Services;

use App\Traits\Base64FileUploadTrait;
use Illuminate\Support\Facades\DB;
use Modules\HR\DTO\WorkerPassportDTO;
use Modules\HR\Models\WorkerPassport;

class WorkerPassportService
{
    use Base64FileUploadTrait;

    public function store(WorkerPassportDTO $dto): void
    {
        DB::transaction(function () use ($dto) {
            $data = [
                'worker_id' => $dto->workerId,
                'serial_number' => $dto->serialNumber,
                'address' => $dto->address,
                'from_date' => $dto->fromDate,
                'to_date' => $dto->toDate,
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'worker-passports',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            WorkerPassport::create($data);
        });
    }

    public function update(WorkerPassport $workerPassport, WorkerPassportDTO $dto): void
    {
        DB::transaction(function () use ($workerPassport, $dto) {
            $data = [
                'serial_number' => $dto->serialNumber,
                'address' => $dto->address,
                'from_date' => $dto->fromDate,
                'to_date' => $dto->toDate,
            ];

            if ($dto->file) {
                $data['file'] = $this->uploadFormFile(
                    $dto->file,
                    'worker-passports',
                    ['pdf', 'docx', 'png', 'jpg', 'jpeg']
                );
            }
            $workerPassport->update($data);
        });
    }

    public function delete(WorkerPassport $workerPassport): void
    {
        $workerPassport->delete();
    }
}
