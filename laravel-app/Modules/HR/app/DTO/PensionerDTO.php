<?php

namespace Modules\HR\DTO;

final readonly class PensionerDTO
{
    public function __construct(
        public string $lastName,
        public string $firstName,
        public string $middleName,
        public ?bool $sex,
        public string $position,
        public string $address,
        public string $pin,
        public string $passport,
        public string|int $experience,
        public string|int $year,
        public string|int $phone,
        public bool $afghan,
        public bool $invalid,
        public bool $chernobyl,
        public bool $railwayTitle,
        public int $organizationId,
    ) {}
}