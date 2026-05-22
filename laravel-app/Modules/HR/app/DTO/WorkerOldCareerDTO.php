<?php

namespace Modules\HR\DTO;

final readonly class WorkerOldCareerDTO
{
    public function __construct(
        public int $workerId,
        public string $fromDate,
        public string $toDate,
        public string $postName,
        public int     $sort = 0,
    ) {}
}