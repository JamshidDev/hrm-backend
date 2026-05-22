<?php

namespace Modules\HR\DTO;

final readonly class ConfirmationWorkerDTO
{
    public function __construct(
        public int    $workerId,
        public string $position,
        public ?int   $level,
        public int    $organizationId
    )
    {
    }
}