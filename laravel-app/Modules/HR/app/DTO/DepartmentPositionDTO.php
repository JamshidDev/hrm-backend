<?php

namespace Modules\HR\DTO;

final readonly class DepartmentPositionDTO
{
    public function __construct(
        public int $departmentId,
        public int $positionId,
        public float $rate,
        public string $education,
        public string $rank,
        public string $salary,
        public int|string $experience,
        public string $maxRank,
        public int $group,
        public int $organizationId,
    )
    {
    }
}