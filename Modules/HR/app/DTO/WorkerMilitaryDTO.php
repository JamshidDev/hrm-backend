<?php

namespace Modules\HR\DTO;

final readonly class WorkerMilitaryDTO
{
    public function __construct(
        public int $workerId,
        public bool $status,
        public ?string $name,
        public ?string $number,
        public ?string $speciality,
        public ?string $commissariat,
    ) {}
}