<?php

namespace Modules\HR\DTO;
use Illuminate\Http\UploadedFile;

final readonly class MedDTO
{
    public function __construct(
        public int $workerId,
        public string $from,
        public ?string $to,
        public string $status,
        public ?string $comment,
        public ?UploadedFile $file,
        public int $userId,
        public int $organizationId,
    ) {}
}