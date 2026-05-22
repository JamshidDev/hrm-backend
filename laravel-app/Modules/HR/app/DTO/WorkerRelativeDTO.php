<?php

namespace Modules\HR\DTO;

final readonly class WorkerRelativeDTO
{
    public function __construct(
        public int     $workerId,
        public ?int    $relativeWorkerId,
        public ?string $pin,
        public ?int    $relative,
        public ?string $lastName,
        public ?string $firstName,
        public ?string $middleName,
        public ?string $birthday,
        public ?string $birthPlace,
        public ?string $postName,
        public ?string $address,
        public int     $sort = 0,
        public ?int     $marital_status,
    )
    {
    }
}