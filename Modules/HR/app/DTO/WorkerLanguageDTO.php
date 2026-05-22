<?php

namespace Modules\HR\DTO;

use Illuminate\Http\UploadedFile;

final readonly class WorkerLanguageDTO
{
    public function __construct(
        public int $workerId,
        public int $languageId,
        public ?UploadedFile $file,
    ) {}
}