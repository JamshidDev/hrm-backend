<?php

namespace Modules\HR\DTO;

use Illuminate\Http\UploadedFile;

final readonly class WorkerPassportDTO
{
    public function __construct(
        public int $workerId,
        public string $serialNumber,
        public string $fromDate,
        public string $toDate,
        public string $address,
        public ?UploadedFile $file,
    ) {}
}