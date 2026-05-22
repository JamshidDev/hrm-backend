<?php

namespace Modules\HR\DTO;

final readonly class WorkerApplicationUrlDTO
{
    public function __construct(
        public int $directorId,
        public int $type,
        public string $fromDate,
        public ?int $departmentPositionId,
        public ?int $workerPositionId,
    ) {}
}