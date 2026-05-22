<?php

namespace Modules\HR\DTO;

final readonly class WorkerPhotoDTO
{
    public function __construct(
        public int $workerId,
        public string $photoBase64,
        public bool $current,
    ) {}
}