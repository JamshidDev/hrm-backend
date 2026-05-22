<?php

namespace Modules\HR\DTO;

final readonly class WorkerApplicationDTO
{
    public function __construct(
        public int $directorId,
        public int $type,
        public ?int $workerPositionId,
        public array $confirmations,
        public array $payload,
    ) {}
}