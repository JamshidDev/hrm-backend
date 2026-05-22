<?php

namespace Modules\HR\DTO;

use Illuminate\Http\UploadedFile;

final readonly class WorkerAcademicTitleDTO
{
    public function __construct(
        public int $workerId,
        public int $type,
        public ?UploadedFile $file,
    ) {}
}