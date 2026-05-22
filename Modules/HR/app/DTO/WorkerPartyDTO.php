<?php

namespace Modules\HR\DTO;

final readonly class WorkerPartyDTO
{
    public function __construct(
        public int $workerId,
        public int $party,
        public string $fromDate,
    ) {}
}