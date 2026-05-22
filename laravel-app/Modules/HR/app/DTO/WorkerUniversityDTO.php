<?php

namespace Modules\HR\DTO;

use Illuminate\Http\UploadedFile;

final readonly class WorkerUniversityDTO
{
    public function __construct(
        public int $workerId,
        public int $universityId,
        public int $specialityId,
        public string $fromDate,
        public string $toDate,
        public ?UploadedFile $file,
    ) {}
}