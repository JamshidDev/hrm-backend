<?php

namespace Modules\HR\DTO;

final readonly class VacancyPositionDTO
{
    public function __construct(
        public array $data,
        public int $departmentPositionId,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            data: $data,
            departmentPositionId: $data['department_position_id']
        );
    }
}