<?php

namespace Modules\HR\DTO;

final readonly class WorkerPhoneDTO
{
    public function __construct(
        public int $workerId,
        public int $phone
    ) {}
}