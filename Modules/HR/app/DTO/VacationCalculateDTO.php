<?php

namespace Modules\HR\DTO;

final readonly class VacationCalculateDTO
{
    public function __construct(
        public int $workerPositionId,
        public string $from,
        public int $mainDay,
        public int $secondDay,
        public array $additional = [],
    ) {}
}