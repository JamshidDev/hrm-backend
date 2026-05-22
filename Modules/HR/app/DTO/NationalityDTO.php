<?php

namespace Modules\HR\DTO;

final readonly class NationalityDTO
{
    public function __construct(
        public string $name
    ) {}
}