<?php

namespace Modules\HR\DTO;

final readonly class OrganizationLeaderDTO
{
    public function __construct(
        public int $organizationId,
        public int $workerPositionId,
        public ?array $phones,
    ) {}
}